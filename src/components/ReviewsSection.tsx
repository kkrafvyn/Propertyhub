import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ThumbsUp, ThumbsDown, Filter, ArrowUpDown as Sort, MessageSquare } from 'lucide-react';
import { Property, User as UserType, Review } from '../types';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ReviewsSectionProps {
  property: Property;
  currentUser: UserType | null;
  userHasBooked: boolean;
  onSubmitReview?: (review: Omit<Review, 'id' | 'createdAt'>) => void;
}

interface ReviewFormData {
  rating: number;
  comment: string;
  categories: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
}

const initialFormData: ReviewFormData = {
  rating: 0,
  comment: '',
  categories: {
    cleanliness: 0,
    communication: 0,
    checkIn: 0,
    accuracy: 0,
    location: 0,
    value: 0,
  },
};

export function ReviewsSection({ property, currentUser, userHasBooked, onSubmitReview }: ReviewsSectionProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [formData, setFormData] = useState<ReviewFormData>(initialFormData);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock reviews data - in real app this would come from props or API
  const mockReviews: Review[] = [
    {
      id: '1',
      propertyId: property.id,
      userId: 'user1',
      userName: 'Sarah Johnson',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
      rating: 5,
      comment: 'Amazing property! Everything was exactly as described. The host was very responsive and the location was perfect. Would definitely stay here again!',
      categories: {
        cleanliness: 5,
        communication: 5,
        checkIn: 5,
        accuracy: 5,
        location: 5,
        value: 4,
      },
      createdAt: '2024-01-15',
      helpful: 12,
      verified: true,
    },
    {
      id: '2',
      propertyId: property.id,
      userId: 'user2',
      userName: 'Recent guest',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      rating: 4,
      comment: 'Great stay overall. The place was clean and well-maintained. Only minor issue was the WiFi was a bit slow, but everything else was perfect.',
      categories: {
        cleanliness: 5,
        communication: 4,
        checkIn: 4,
        accuracy: 4,
        location: 4,
        value: 4,
      },
      createdAt: '2024-01-10',
      helpful: 8,
      verified: true,
    },
    {
      id: '3',
      propertyId: property.id,
      userId: 'user3',
      userName: 'Emma Rodriguez',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      rating: 5,
      comment: 'Absolutely loved this place! The host went above and beyond to make our stay comfortable. The amenities were top-notch and the location was ideal for exploring the city.',
      categories: {
        cleanliness: 5,
        communication: 5,
        checkIn: 5,
        accuracy: 5,
        location: 5,
        value: 5,
      },
      createdAt: '2024-01-05',
      helpful: 15,
      verified: true,
    },
  ];

  const filteredAndSortedReviews = useMemo(() => {
    let filtered = mockReviews;
    
    // Filter by rating
    if (filterBy !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(filterBy));
    }
    
    // Sort reviews
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [mockReviews, sortBy, filterBy]);

  const averageRating = useMemo(() => {
    if (mockReviews.length === 0) return 0;
    return mockReviews.reduce((sum, review) => sum + review.rating, 0) / mockReviews.length;
  }, [mockReviews]);

  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    mockReviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  }, [mockReviews]);

  const categoryAverages = useMemo(() => {
    if (mockReviews.length === 0) return {};
    
    const categories = ['cleanliness', 'communication', 'checkIn', 'accuracy', 'location', 'value'] as const;
    const averages: Record<string, number> = {};
    
    categories.forEach(category => {
      const sum = mockReviews.reduce((total, review) => total + review.categories[category], 0);
      averages[category] = sum / mockReviews.length;
    });
    
    return averages;
  }, [mockReviews]);

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md', interactive = false, onRatingChange?: (rating: number) => void) => {
    const starSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
            onClick={() => interactive && onRatingChange?.(star)}
            whileHover={interactive ? { scale: 1.1 } : {}}
            whileTap={interactive ? { scale: 0.95 } : {}}
            disabled={!interactive}
          >
            <Star
              className={`${starSize} ${
                star <= rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </motion.button>
        ))}
      </div>
    );
  };

  const handleSubmitReview = async () => {
    if (!currentUser || !userHasBooked) return;
    
    setIsSubmitting(true);
    
    try {
      const newReview: Omit<Review, 'id' | 'createdAt'> = {
        propertyId: property.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar || '',
        rating: formData.rating,
        comment: formData.comment,
        categories: formData.categories,
        helpful: 0,
        verified: true,
      };
      
      onSubmitReview?.(newReview);
      setShowReviewForm(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Reviews Overview */}
      <motion.div
        className="bg-card rounded-2xl p-6 border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Overall Rating */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Guest Reviews</h3>
            
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
              <div className="space-y-2">
                {renderStars(averageRating, 'lg')}
                <div className="text-sm text-muted-foreground">
                  {mockReviews.length} review{mockReviews.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-12">
                    <span className="text-sm">{rating}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all duration-500"
                      style={{
                        width: `${mockReviews.length > 0 ? (ratingDistribution[rating as keyof typeof ratingDistribution] / mockReviews.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">
                    {ratingDistribution[rating as keyof typeof ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            <h4 className="font-semibold">Rating Categories</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(categoryAverages).map(([category, average]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{category.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-medium">{average.toFixed(1)}</span>
                  </div>
                  {renderStars(average, 'sm')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Write Review Button */}
      {currentUser && userHasBooked && !showReviewForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Button
            onClick={() => setShowReviewForm(true)}
            className="w-full"
            size="lg"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Write a Review
          </Button>
        </motion.div>
      )}

      {/* Review Form */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            className="bg-card rounded-2xl p-6 border border-border"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold mb-6">Write Your Review</h3>
            
            <div className="space-y-6">
              {/* Overall Rating */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Overall Rating</label>
                {renderStars(formData.rating, 'lg', true, (rating) => 
                  setFormData(prev => ({ ...prev, rating }))
                )}
              </div>

              {/* Category Ratings */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Category Ratings</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formData.categories).map(([category, rating]) => (
                    <div key={category} className="space-y-2">
                      <div className="text-sm capitalize">
                        {category.replace(/([A-Z])/g, ' $1')}
                      </div>
                      {renderStars(rating, 'sm', true, (newRating) =>
                        setFormData(prev => ({
                          ...prev,
                          categories: { ...prev.categories, [category]: newRating }
                        }))
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Your Review</label>
                <Textarea
                  placeholder="Share your experience with future guests..."
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={formData.rating === 0 || !formData.comment.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and Sorting */}
      {mockReviews.length > 0 && (
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter:</span>
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="5">5★</SelectItem>
                  <SelectItem value="4">4★</SelectItem>
                  <SelectItem value="3">3★</SelectItem>
                  <SelectItem value="2">2★</SelectItem>
                  <SelectItem value="1">1★</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Sort className="w-4 h-4" />
              <span className="text-sm font-medium">Sort:</span>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="highest">Highest</SelectItem>
                  <SelectItem value="lowest">Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedReviews.length} of {mockReviews.length} reviews
          </div>
        </motion.div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        <AnimatePresence>
          {filteredAndSortedReviews.map((review, index) => (
            <motion.div
              key={review.id}
              className="bg-card rounded-2xl p-6 border border-border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="space-y-4">
                {/* Review Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <img src={review.userAvatar} alt={review.userName} />
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{review.userName}</span>
                        {review.verified && (
                          <Badge variant="secondary" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {renderStars(review.rating, 'sm')}
                    <div className="text-sm text-muted-foreground mt-1">
                      {review.rating}/5
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <p className="text-muted-foreground leading-relaxed">
                  {review.comment}
                </p>

                {/* Helpfulness */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span>Helpful ({review.helpful})</span>
                    </button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Stayed in {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {mockReviews.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
          <p className="text-muted-foreground">
            Be the first to share your experience with this property!
          </p>
        </motion.div>
      )}
    </div>
  );
}
