/**
 * AI Assistant Types
 * 
 * Type definitions for AI-powered features
 */

export type AIInteractionType = 'chat' | 'search' | 'description_generation' | 'recommendations' | 'price_prediction';
export type AIProviderType = 'openai' | 'gemini' | 'claude' | 'local';

/**
 * AI Interaction
 */
export interface AIInteraction {
  id: string;
  user_id: string;
  interaction_type: AIInteractionType;
  input_text: string;
  output_text: string;
  property_id?: string;
  tokens_used: number;
  cost_cents: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

/**
 * Property Description (AI Generated)
 */
export interface PropertyDescription {
  id: string;
  property_id: string;
  description: string;
  generated_by: 'ai' | 'user' | 'ai_edited';
  ai_version?: string;
  quality_score: number; // 0-100
  user_satisfaction?: number; // 1-5
  created_at: string;
}

/**
 * Property Recommendation
 */
export interface PropertyRecommendation {
  id: string;
  user_id: string;
  property_id: string;
  reason: string;
  score: number; // 0-1
  clicked: boolean;
  created_at: string;
}

/**
 * AI Price Prediction
 */
export interface PricePrediction {
  id: string;
  property_id: string;
  predicted_price: number;
  market_average: number;
  confidence_score: number; // 0-1
  factors: Array<{
    factor: string;
    impact: number;
  }>;
  created_at: string;
}

/**
 * AI Property Assistant Chat
 */
export interface AIAssistantQuery {
  id: string;
  user_id: string;
  query: string;
  conversation_id?: string;
  response: string;
  metadata?: {
    location?: string;
    budget_min?: number;
    budget_max?: number;
    bedrooms?: number;
    furnished?: boolean;
    nearby_schools?: boolean;
    parking?: boolean;
  };
  properties_mentioned?: string[]; // property IDs
  created_at: string;
}

/**
 * Description Generation Request
 */
export interface DescriptionGenerationRequest {
  property_id: string;
  property_data: {
    title: string;
    type: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    amenities: string[];
    location: string;
    price?: number;
  };
  tone?: 'formal' | 'casual' | 'luxury' | 'budget_friendly';
  length?: 'short' | 'medium' | 'long';
}

/**
 * Recommendation Engine Input
 */
export interface RecommendationInput {
  user_id: string;
  search_history: Array<{
    query: string;
    filters: Record<string, any>;
  }>;
  viewed_properties: string[];
  saved_properties: string[];
  user_preferences: {
    location?: string;
    budget_min?: number;
    budget_max?: number;
    property_type?: string;
  };
}

/**
 * Price Prediction Input
 */
export interface PricePredictionInput {
  property_id?: string;
  property_data: {
    type: string;
    bedrooms?: number;
    bathrooms?: number;
    area: number;
    location: string;
    amenities: string[];
    condition?: 'new' | 'good' | 'fair' | 'needs_repair';
  };
  market_context?: {
    location_index?: number;
    trend_direction?: 'up' | 'down' | 'stable';
    time_on_market_days?: number;
  };
}

/**
 * AI Response
 */
export interface AIResponse<T = any> {
  status: 'success' | 'error';
  data: T;
  tokens_used: number;
  cost_cents: number;
  timestamp: string;
}

/**
 * Description Quality Metrics
 */
export interface DescriptionQuality {
  readability_score: number;
  keyword_optimization: number;
  seo_score: number;
  engagement_score: number;
  overall_score: number;
  suggestions?: string[];
}

/**
 * AI Recommendation Score
 */
export interface RecommendationScore {
  score: number; // 0-1
  reasons: string[];
  match_percentage: number;
  budget_match: number;
  location_match: number;
  features_match: number;
}

