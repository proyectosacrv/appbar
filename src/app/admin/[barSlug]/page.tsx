import { redirect } from "next/navigation";

interface AdminBarPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function AdminBarPage({ params }: AdminBarPageProps) {
  const { barSlug } = await params;
  redirect(`/admin/${barSlug}/orders`);
}
