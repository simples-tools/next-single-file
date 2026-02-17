import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">About Us</h1>
      <p className="text-lg mb-6">This is the about page of our test Next.js app.</p>
      <Link href="/" className="text-blue-500 hover:underline">
        Go back home
      </Link>
    </main>
  );
}
