import type { Review } from '../types';
import type { ReviewDB } from '../types/database';
import { supabase } from './supabaseClient';
import { reviewService } from './supabaseApi';

const mapDatabaseReviewToAppReview = (
  review: ReviewDB,
  userMap: Map<string, { name?: string; avatar?: string }>
): Review => {
  const reviewer = userMap.get(review.reviewer_id);

  return {
    id: review.id,
    propertyId: review.property_id,
    userId: review.reviewer_id,
    userName: reviewer?.name || 'Verified guest',
    userAvatar: reviewer?.avatar || '',
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
    helpful: review.helpful_count || 0,
    verified: review.verified_booking,
    categories: {
      cleanliness: review.cleanliness || review.rating,
      communication: review.communication || review.rating,
      checkIn: review.accuracy || review.rating,
      accuracy: review.accuracy || review.rating,
      location: review.location || review.rating,
      value: review.value || review.rating,
    },
  };
};

export const loadPropertyReviews = async (propertyId: string): Promise<Review[]> => {
  const { data, error } = await reviewService.getPropertyReviews(propertyId);
  if (error || !data?.length) {
    if (error) {
      throw error;
    }

    return [];
  }

  const reviews = data as ReviewDB[];
  const reviewerIds = [...new Set(reviews.map((review) => review.reviewer_id).filter(Boolean))];
  const userMap = new Map<string, { name?: string; avatar?: string }>();

  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from('users')
      .select('id, name, avatar')
      .in('id', reviewerIds);

    (reviewers || []).forEach((reviewer: any) => {
      userMap.set(reviewer.id, {
        name: reviewer.name,
        avatar: reviewer.avatar,
      });
    });
  }

  return reviews.map((review) => mapDatabaseReviewToAppReview(review, userMap));
};

export const createPropertyReview = async (input: {
  propertyId: string;
  ownerId?: string;
  reviewerId: string;
  rating: number;
  comment: string;
  verifiedBooking: boolean;
  categories: Review['categories'];
}): Promise<ReviewDB> => {
  const title =
    input.comment.trim().split(/\s+/).slice(0, 8).join(' ') || 'Property review';

  const { data, error } = await reviewService.createReview({
    property_id: input.propertyId,
    reviewer_id: input.reviewerId,
    owner_id: input.ownerId || input.reviewerId,
    rating: input.rating,
    title,
    comment: input.comment.trim(),
    cleanliness: input.categories.cleanliness,
    communication: input.categories.communication,
    accuracy: input.categories.accuracy,
    location: input.categories.location,
    value: input.categories.value,
    verified_booking: input.verifiedBooking,
    helpful_count: 0,
    updated_at: new Date().toISOString(),
  } as Partial<ReviewDB>);

  if (error || !data) {
    throw error || new Error('Failed to submit review.');
  }

  return data as ReviewDB;
};
