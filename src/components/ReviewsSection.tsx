import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Filter, Loader2, MessageSquare, Star, ThumbsUp, ArrowUpDown as Sort } from 'lucide-react';
import { toast } from 'sonner';
import type { Property, Review, User as UserType } from '../types';
import { createPropertyReview, loadPropertyReviews } from '../services/reviewDataService';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

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

const ratingCategories: Array<keyof ReviewFormData['categories']> = [
  'cleanliness',
  'communication',
  'checkIn',
  'accuracy',
  'location',
  'value',
];

const formatCategoryLabel = (value: string) =>
  value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());

const buildAvatarFallback = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('') || 'GU';

export function ReviewsSection({
  property,
  currentUser,
  userHasBooked,
  onSubmitReview,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [formData, setFormData] = useState<ReviewFormData>(initialFormData);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchReviews = async () => {
      setLoading(true);

      try {
        const nextReviews = await loadPropertyReviews(property.id);
        if (!cancelled) {
          setReviews(nextReviews);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : 'Unable to load property reviews.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [property.id]);

  const filteredAndSortedReviews = useMemo(() => {
    const filteredReviews =
      filterBy === 'all'
        ? [...reviews]
        : reviews.filter((review) => review.rating === Number.parseInt(filterBy, 10));

    filteredReviews.sort((firstReview, secondReview) => {
      switch (sortBy) {
        case 'newest':
          return (
            new Date(secondReview.createdAt).getTime() -
            new Date(firstReview.createdAt).getTime()
          );
        case 'oldest':
          return (
            new Date(firstReview.createdAt).getTime() -
            new Date(secondReview.createdAt).getTime()
          );
        case 'highest':
          return secondReview.rating - firstReview.rating;
        case 'lowest':
          return firstReview.rating - secondReview.rating;
        default:
          return 0;
      }
    });

    return filteredReviews;
  }, [filterBy, reviews, sortBy]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((review) => {
      distribution[review.rating as keyof typeof distribution] += 1;
    });

    return distribution;
  }, [reviews]);

  const categoryAverages = useMemo(() => {
    if (reviews.length === 0) return {};

    return ratingCategories.reduce<Record<string, number>>((accumulator, category) => {
      const sum = reviews.reduce(
        (total, review) => total + review.categories[category],
        0,
      );
      accumulator[category] = sum / reviews.length;
      return accumulator;
    }, {});
  }, [reviews]);

  const existingUserReview = useMemo(() => {
    if (!currentUser) return null;
    return reviews.find((review) => review.userId === currentUser.id) || null;
  }, [currentUser, reviews]);

  const renderStars = (
    rating: number,
    size: 'sm' | 'md' | 'lg' = 'md',
    interactive = false,
    onRatingChange?: (rating: number) => void,
  ) => {
    const starSize = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6';

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
            disabled={!interactive}
            onClick={() => interactive && onRatingChange?.(star)}
            whileHover={interactive ? { scale: 1.08 } : {}}
            whileTap={interactive ? { scale: 0.96 } : {}}
          >
            <Star
              className={`${starSize} ${
                star <= Math.round(rating)
                  ? 'fill-yellow-400 text-yellow-400'
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
      await createPropertyReview({
        propertyId: property.id,
        ownerId: property.ownerId,
        reviewerId: currentUser.id,
        rating: formData.rating,
        comment: formData.comment,
        verifiedBooking: userHasBooked,
        categories: formData.categories,
      });

      const optimisticReview: Review = {
        id: `review-${Date.now()}`,
        propertyId: property.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar || '',
        rating: formData.rating,
        comment: formData.comment.trim(),
        categories: formData.categories,
        createdAt: new Date().toISOString(),
        helpful: 0,
        verified: userHasBooked,
      };

      setReviews((previous) => [optimisticReview, ...previous]);
      onSubmitReview?.({
        propertyId: optimisticReview.propertyId,
        userId: optimisticReview.userId,
        userName: optimisticReview.userName,
        userAvatar: optimisticReview.userAvatar,
        rating: optimisticReview.rating,
        comment: optimisticReview.comment,
        categories: optimisticReview.categories,
        helpful: optimisticReview.helpful,
        verified: optimisticReview.verified,
      });
      setShowReviewForm(false);
      setFormData(initialFormData);
      toast.success('Review submitted successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        className="rounded-2xl border border-border bg-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading guest reviews...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Guest Reviews</h3>

              <div className="flex items-center space-x-4">
                <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
                <div className="space-y-2">
                  {renderStars(averageRating, 'lg')}
                  <div className="text-sm text-muted-foreground">
                    {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-3">
                    <div className="flex w-12 items-center space-x-1">
                      <span className="text-sm">{rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${
                            reviews.length > 0
                              ? (ratingDistribution[rating as keyof typeof ratingDistribution] /
                                  reviews.length) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-sm text-muted-foreground">
                      {ratingDistribution[rating as keyof typeof ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Rating Categories</h4>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(categoryAverages).map(([category, average]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{formatCategoryLabel(category)}</span>
                      <span className="font-medium">{average.toFixed(1)}</span>
                    </div>
                    {renderStars(average, 'sm')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {currentUser && userHasBooked && !showReviewForm && !existingUserReview ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Button onClick={() => setShowReviewForm(true)} className="w-full" size="lg">
            <MessageSquare className="mr-2 h-5 w-5" />
            Write a Review
          </Button>
        </motion.div>
      ) : null}

      {existingUserReview && !showReviewForm ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-medium text-foreground">You already reviewed this property.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thanks for sharing your experience. Your review is visible below with the rest.
          </p>
        </div>
      ) : null}

      <AnimatePresence>
        {showReviewForm ? (
          <motion.div
            className="rounded-2xl border border-border bg-card p-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="mb-6 text-xl font-semibold">Write Your Review</h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Overall Rating</label>
                {renderStars(formData.rating, 'lg', true, (rating) =>
                  setFormData((previous) => ({ ...previous, rating })),
                )}
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">Category Ratings</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formData.categories).map(([category, rating]) => (
                    <div key={category} className="space-y-2">
                      <div className="text-sm">{formatCategoryLabel(category)}</div>
                      {renderStars(rating, 'sm', true, (newRating) =>
                        setFormData((previous) => ({
                          ...previous,
                          categories: {
                            ...previous.categories,
                            [category]: newRating,
                          },
                        })),
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Your Review</label>
                <Textarea
                  placeholder="Share your experience with future guests..."
                  rows={4}
                  value={formData.comment}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      comment: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={formData.rating === 0 || !formData.comment.trim() || isSubmitting}
                  onClick={() => {
                    void handleSubmitReview();
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!loading && reviews.length > 0 ? (
        <motion.div
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filter:</span>
              <Select
                value={filterBy}
                onValueChange={(value: 'all' | '5' | '4' | '3' | '2' | '1') =>
                  setFilterBy(value)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="5">5 stars</SelectItem>
                  <SelectItem value="4">4 stars</SelectItem>
                  <SelectItem value="3">3 stars</SelectItem>
                  <SelectItem value="2">2 stars</SelectItem>
                  <SelectItem value="1">1 star</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Sort className="h-4 w-4" />
              <span className="text-sm font-medium">Sort:</span>
              <Select
                value={sortBy}
                onValueChange={(value: 'newest' | 'oldest' | 'highest' | 'lowest') =>
                  setSortBy(value)
                }
              >
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
            Showing {filteredAndSortedReviews.length} of {reviews.length} reviews
          </div>
        </motion.div>
      ) : null}

      <div className="space-y-6">
        <AnimatePresence>
          {filteredAndSortedReviews.map((review, index) => (
            <motion.div
              key={review.id}
              className="rounded-2xl border border-border bg-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.userAvatar} alt={review.userName} />
                      <AvatarFallback>{buildAvatarFallback(review.userName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{review.userName}</span>
                        {review.verified ? (
                          <Badge variant="secondary" className="text-xs">
                            Verified
                          </Badge>
                        ) : null}
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
                    <div className="mt-1 text-sm text-muted-foreground">{review.rating}/5</div>
                  </div>
                </div>

                <p className="leading-relaxed text-muted-foreground">{review.comment}</p>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                      <ThumbsUp className="h-4 w-4" />
                      <span>Helpful ({review.helpful})</span>
                    </button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Stayed in{' '}
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && reviews.length === 0 ? (
        <motion.div
          className="py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <MessageSquare className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No reviews yet</h3>
          <p className="text-muted-foreground">
            Be the first to share your experience with this property.
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
