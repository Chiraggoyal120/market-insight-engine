export interface ProductFormData {
  product_name: string;
  product_description: string;
  founder_profile?: string;
  category: string;
  run_mode: string;
  email_id: string;
}

export interface Product {
  product_id: string;
  product_name: string;
  product_description: string;
  founder_profile: string | null;
  category: string;
  status: string;
  created_at: string;
}

export interface TargetGroup {
  tg_id: string;
  product_id: string;
  tg_name: string;
  tg_description: string;
  tg_type: 'Primary' | 'Secondary';
  priority: number;
  tg_insights?: TGInsight[];
}

export interface TGInsight {
  insight_id: string;
  tg_id: string;
  supporting_posts: {
    sample_size: number;
    pain_points: Array<{ pain: string; mentions: number }>;
    desires: Array<{ desire: string; mentions: number }>;
    language_patterns: {
      tone: string;
      common_phrases: string[];
    };
    trust_signals: {
      avg_upvotes: number;
      avg_comments: number;
      authenticity_score: number;
    };
  };
  confidence_score: number;
}

export interface ProductPositioning {
  positioning_id: string;
  product_id: string;
  positioning_data: {
    core_messaging: {
      value_proposition: string;
      key_differentiators: string[];
    };
    founder_voice: {
      communication_style: string;
      language_to_adopt: string[];
      language_to_avoid: string[];
    };
    content_pillars: Array<{
      theme: string;
      goal: string;
      formats: string[];
      channels: string[];
    }>;
    positioning_statement: string;
    action_plan: {
      top_subreddits: Array<{
        name: string;
        priority: string;
        rationale: string;
      }>;
      first_30_days: Array<{
        week: number;
        action: string;
        expected_outcome: string;
      }>;
    };
  };
  generated_at: string;
}
