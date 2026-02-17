import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <article className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">
          {slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
        </h1>
        <p className="text-lg mb-6">
          This is the content for the blog post with slug: <code className="bg-gray-100 px-2 py-1 rounded">{slug}</code>
        </p>
        <p className="text-gray-600 mb-8">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </article>
      <div className="space-x-4">
        <Link href="/blog" className="text-blue-500 hover:underline">
          Back to blog
        </Link>
        <Link href="/" className="text-blue-500 hover:underline">
          Go home
        </Link>
      </div>
    </main>
  );
}

export async function generateStaticParams() {
  return [
    { slug: "first-post" },
    { slug: "second-post" },
    { slug: "third-post" },
  ];
}
