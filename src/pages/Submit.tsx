import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import type { ProductFormData } from "@/lib/types";

const categories = [
  "SaaS",
  "E-commerce",
  "Mobile App",
  "AI/ML",
  "Dev Tools",
  "Other",
];

const runModes = [
  { value: "full", label: "Full Research (AI + Data + Analysis)" },
  { value: "ai_only", label: "AI Research Only" },
  { value: "manual", label: "Manual Scrape Only" },
];

const Submit = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    product_name: "",
    product_description: "",
    founder_profile: "",
    category: "",
    run_mode: "",
    email_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate required fields
    if (!formData.product_name || !formData.product_description || !formData.category || !formData.run_mode || !formData.email_id) {
      setError("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    // Generate UUIDs
    const productId = uuidv4();
    const userId = uuidv4();

    try {
      // In dev: use proxy to avoid CORS (browser → Vite → n8n). In prod: direct URL (needs CORS or your own proxy).
      const directUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      const webhookUrl = import.meta.env.DEV ? "/api/n8n-webhook" : directUrl;

      if (!directUrl) {
        throw new Error("Webhook URL not configured. Add VITE_N8N_WEBHOOK_URL in .env");
      }

      // Transform data for n8n – use product_id when writing results to Supabase
      const payload = {
        // Required for n8n → Supabase: use this product_id in all inserts
        product_id: productId,
        user_id: userId,
        submitted_at: new Date().toISOString(),
        // Form fields (Pascal Case for n8n UI, snake_case for scripts)
        "Product Name": formData.product_name,
        product_name: formData.product_name,
        "Product Description": formData.product_description,
        product_description: formData.product_description,
        "Founder Profile": formData.founder_profile || "",
        founder_profile: formData.founder_profile || "",
        "Category": formData.category,
        category: formData.category,
        "Run Mode": formData.run_mode,
        run_mode: formData.run_mode,
        "User ID": userId,
        "Email_ID": formData.email_id,
        email_id: formData.email_id,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 404 && text.includes("not registered")) {
          throw new Error(
            "n8n webhook not active. In n8n: open your workflow → turn ON 'Active' (top right), or in test mode click 'Execute workflow' first."
          );
        }
        throw new Error(`Webhook returned ${response.status}. ${text || "Try again."}`);
      }

      setSuccess(true);

      // Save productId to localStorage for recovery if user refreshes
      localStorage.setItem('lastProductId', productId);
      localStorage.setItem('productSubmitTime', new Date().toISOString());

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(`/results/${productId}`);
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      const isNetwork = msg.includes("Failed to fetch") || msg.includes("NetworkError");
      setError(
        isNetwork
          ? "Request to webhook failed (network/CORS). In dev we use a proxy – restart dev server. In production use a backend proxy or enable CORS on n8n."
          : msg
      );
      setIsLoading(false);
    }
  };

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
            <CardHeader>
              <CardTitle className="text-2xl">Submit Your Product</CardTitle>
              <CardDescription>
                Fill in the details below and our AI will analyze your market in minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-6 border-green-500 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Workflow triggered successfully! Redirecting...
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    placeholder="e.g., TaskFlow Pro"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_description">Product Description *</Label>
                  <Textarea
                    id="product_description"
                    placeholder="Describe what your product does and the problem it solves..."
                    rows={4}
                    value={formData.product_description}
                    onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder_profile">Founder Profile (Optional)</Label>
                  <Textarea
                    id="founder_profile"
                    placeholder="Tell us about yourself and your background..."
                    rows={3}
                    value={formData.founder_profile}
                    onChange={(e) => setFormData({ ...formData, founder_profile: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="run_mode">Run Mode *</Label>
                  <Select
                    value={formData.run_mode}
                    onValueChange={(value) => setFormData({ ...formData, run_mode: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select run mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {runModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_id">Email Address *</Label>
                  <Input
                    id="email_id"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email_id}
                    onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full py-6 text-lg font-semibold"
                  disabled={isLoading || success}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Start Analysis"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Submit;
