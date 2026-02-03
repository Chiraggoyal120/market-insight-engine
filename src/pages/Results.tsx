import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  Download, 
  Target, 
  TrendingUp,
  MessageSquare,
  Calendar,
  Users,
  ThumbsUp,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Product, TargetGroup, ProductPositioning } from "@/lib/types";

const loadingSteps = [
  "Identifying target audiences",
  "Scraping Reddit discussions",
  "Analyzing pain points & desires",
  "Generating positioning strategy",
];

const Results = () => {
  const { productId } = useParams<{ productId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [positioning, setPositioning] = useState<ProductPositioning | null>(null);

  useEffect(() => {
    if (!productId) return;

    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        // Check if positioning exists (indicates analysis is complete)
        // Using type assertion since Supabase types don't include this table yet
        const { data: positioningData, error: posError } = await (supabase as any)
          .from("product_positioning")
          .select("*")
          .eq("product_id", productId)
          .order("positioning_id", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log("product_positioning poll:", {
          productId,
          positioningData,
          posError,
        });

        if (posError) {
          console.error("Error checking positioning:", posError);
          setError(
            `Supabase error reading product_positioning: ${posError.message || String(posError)}`
          );
          setIsLoading(false);
          clearInterval(interval);
          return;
        }

        if (!positioningData) {
          console.log("No positioning row yet for product:", productId);
          return; // keep polling
        }

        // Analysis complete - fetch all data
        clearInterval(interval);
        await fetchResults();
      } catch (err) {
        console.error("Error checking status:", err);
        setError(
          `Unexpected error checking status: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setIsLoading(false);
        clearInterval(interval);
      }
    };

    const fetchResults = async () => {
      try {
        // Fetch product - using type assertion since database tables aren't created via migration yet
        const { data: productData, error: productError } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("product_id", productId)
          .maybeSingle();

        if (productError) throw productError;
        
        // Cast to Product type since Supabase types aren't set up yet
        setProduct(productData as unknown as Product);

        // Fetch target groups with insights
        const { data: tgData, error: tgError } = await (supabase as any)
          .from("target_groups")
          .select(`
            *,
            tg_insights(*)
          `)
          .eq("product_id", productId)
          .order("priority", { ascending: true });

        if (tgError) throw tgError;
        setTargetGroups(tgData as unknown as TargetGroup[]);

        // Fetch positioning
        const { data: posData, error: posError } = await (supabase as any)
          .from("product_positioning")
          .select("*")
          .eq("product_id", productId)
          .order("positioning_id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (posError) throw posError;

        // Supabase may return json columns as string depending on how data was inserted
        let normalizedPosData: any = posData;
        const positioningDataRaw = (posData as any)?.positioning_data;
        if (typeof positioningDataRaw === "string") {
          try {
            normalizedPosData = {
              ...(posData as any),
              positioning_data: JSON.parse(positioningDataRaw),
            };
          } catch (e) {
            console.error("Failed to parse positioning_data JSON:", e, positioningDataRaw);
          }
        }

        setPositioning(normalizedPosData as ProductPositioning);

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to load results. Please try again later.");
        setIsLoading(false);
      }
    };

    // Initial check
    checkStatus();
    
    // Poll every 10 seconds
    interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, [productId]);

  const handleDownload = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-lg">
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6 relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    Analyzing Your Product...
                  </h2>
                  <div className="space-y-3 mb-6">
                    {loadingSteps.map((step, index) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.3 }}
                        className="flex items-center text-muted-foreground"
                      >
                        <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                        {step}
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This typically takes 3-5 minutes. Page will auto-refresh.
                  </p>
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                    Data comes from Supabase. Ensure your n8n workflow writes to{" "}
                    <code className="bg-muted px-1 rounded">products</code>,{" "}
                    <code className="bg-muted px-1 rounded">target_groups</code>,{" "}
                    <code className="bg-muted px-1 rounded">product_positioning</code> with{" "}
                    <code className="bg-muted px-1 rounded font-mono">product_id: {productId}</code>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <Card className="shadow-lg">
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Error</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Avoid blank screen if data is missing/unexpected
  if (!product && !positioning && targetGroups.length === 0) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <Card className="shadow-lg">
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">No results found</h2>
                <p className="text-muted-foreground">
                  We couldn’t load results for this product yet. Check that Supabase has rows in{" "}
                  <code className="bg-muted px-1 rounded">products</code>,{" "}
                  <code className="bg-muted px-1 rounded">target_groups</code>, and{" "}
                  <code className="bg-muted px-1 rounded">product_positioning</code> for{" "}
                  <code className="bg-muted px-1 rounded font-mono">{productId}</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 print:py-4">
      <div className="mx-auto max-w-6xl">
        <div className="print:hidden">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Product Header */}
          {product && (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-3xl">{product.product_name}</CardTitle>
                    <p className="mt-2 text-muted-foreground">{product.product_description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{product.category}</Badge>
                    <Badge className="bg-success/10 text-success hover:bg-success/10">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Analysis Complete
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Market Positioning Strategy */}
          {positioning && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Market Positioning Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Positioning Statement */}
                <div className="rounded-lg bg-primary/10 p-6">
                  <h4 className="text-sm font-medium text-primary mb-2">Positioning Statement</h4>
                  <p className="text-lg font-medium text-foreground">
                    {positioning.positioning_data?.positioning_statement ?? ""}
                  </p>
                </div>

                {/* Core Messaging */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Core Messaging</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">Value Proposition</h5>
                      <p className="text-foreground">
                        {positioning.positioning_data?.core_messaging?.value_proposition ?? ""}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-2">Key Differentiators</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {(positioning.positioning_data?.core_messaging?.key_differentiators ?? []).map(
                          (diff, i) => (
                          <li key={i} className="text-foreground">{diff}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Founder Voice Guide */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Founder Voice Guide</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-success/10 p-4">
                      <h5 className="flex items-center gap-1 text-sm font-medium text-success mb-2">
                        <CheckCircle className="h-4 w-4" />
                        Language to Adopt
                      </h5>
                      <ul className="space-y-1">
                        {(positioning.positioning_data?.founder_voice?.language_to_adopt ?? []).map((lang, i) => (
                          <li key={i} className="text-sm text-success">• {lang}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg bg-destructive/10 p-4">
                      <h5 className="flex items-center gap-1 text-sm font-medium text-destructive mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Language to Avoid
                      </h5>
                      <ul className="space-y-1">
                        {(positioning.positioning_data?.founder_voice?.language_to_avoid ?? []).map((lang, i) => (
                          <li key={i} className="text-sm text-destructive">• {lang}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 30-Day Action Plan */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    30-Day Action Plan
                  </h4>
                  <div className="space-y-3">
                    {(positioning.positioning_data?.action_plan?.first_30_days ?? []).map((item, i) => (
                      <div key={i} className="flex gap-4 rounded-lg border p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                          W{item.week}
                        </div>
                        <div>
                          <h5 className="font-medium text-foreground">{item.action}</h5>
                          <p className="text-sm text-muted-foreground">{item.expected_outcome}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Subreddits */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Top Subreddits</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(positioning.positioning_data?.action_plan?.top_subreddits ?? []).map((sub, i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">r/{sub.name}</span>
                          <Badge variant={sub.priority === "High" ? "default" : "secondary"}>
                            {sub.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{sub.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target Audience Insights */}
          {targetGroups.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Target Audience Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {targetGroups.map((tg) => (
                  <div key={tg.tg_id} className="rounded-lg border p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h4 className="text-xl font-semibold text-foreground">{tg.tg_name}</h4>
                      <Badge variant={tg.tg_type === "Primary" ? "default" : "secondary"}>
                        {tg.tg_type}
                      </Badge>
                      <Badge variant="outline">Priority {tg.priority}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{tg.tg_description}</p>

                    {tg.tg_insights && tg.tg_insights.length > 0 && (
                      <div className="space-y-4">
                        {tg.tg_insights.map((insight) => (
                          <div key={insight.insight_id} className="space-y-4">
                            {/* Pain Points */}
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-2">Top Pain Points</h5>
                              <div className="space-y-2">
                                {insight.supporting_posts.pain_points.slice(0, 3).map((pain, i) => (
                                  <div key={i} className="flex items-center justify-between rounded bg-destructive/10 px-3 py-2">
                                    <span className="text-sm text-destructive">{pain.pain}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {pain.mentions} mentions
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Desires */}
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-2">Top Desires</h5>
                              <div className="space-y-2">
                                {insight.supporting_posts.desires.slice(0, 3).map((desire, i) => (
                                  <div key={i} className="flex items-center justify-between rounded bg-success/10 px-3 py-2">
                                    <span className="text-sm text-success">{desire.desire}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {desire.mentions} mentions
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Common Phrases */}
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-2">Common Phrases</h5>
                              <div className="flex flex-wrap gap-2">
                                {insight.supporting_posts.language_patterns.common_phrases.map((phrase, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {phrase}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-4 pt-2 border-t text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                {insight.supporting_posts.sample_size} posts analyzed
                              </span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-4 w-4" />
                                {insight.supporting_posts.trust_signals.avg_upvotes} avg upvotes
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                {Math.round(insight.confidence_score * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Download Button */}
          <div className="flex justify-center print:hidden">
            <Button onClick={handleDownload} size="lg" variant="outline">
              <Download className="mr-2 h-5 w-5" />
              Download Full Report (PDF)
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Results;
