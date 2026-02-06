import Badge from "@/components/ui/Badge";

interface ConfidenceBadgeProps {
  confidence: number;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const variant =
    confidence > 0.9 ? "success" : confidence >= 0.7 ? "warning" : "error";

  return <Badge variant={variant}>{Math.round(confidence * 100)}%</Badge>;
}
