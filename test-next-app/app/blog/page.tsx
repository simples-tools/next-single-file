import Link from "next/link";

const posts = [
  { slug: "first-post", title: "My First Post" },
  { slug: "second-post", title: "Another Great Post" },
  { slug: "third-post", title: "Yet Another Post" },
];

export default function BlogPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div className="w-full max-w-md space-y-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block p-4 border rounded-lg hover:bg-gray-100"
          >
            <h2 className="text-xl font-semibold">{post.title}</h2>
          </Link>
        ))}
      </div>
      <Link href="/" className="mt-8 text-blue-500 hover:underline">
        Go back home
      </Link>
    </main>
  );
}
