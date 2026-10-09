import Link from "next/link";
import MainNav from "../verble/components/MainNav";

export default function TermsPage() {
  return (
    <>
      <MainNav label="Terms of Use" />
      <main className="min-h-screen bg-transparent px-5 pb-12 text-[#2c2f31] sm:px-8">
        <section className="mx-auto mt-6 max-w-4xl rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(44,47,49,0.06)] sm:p-10">
          <h1 className="font-headline text-3xl font-extrabold text-[#2c2f31]">Terms of Use</h1>
          <p className="mt-2 text-sm text-[#595c5e]">Last updated October 9, 2026.</p>

          <div className="mt-6 space-y-4 text-[15px] leading-7 text-[#3e4245]">
            <p>By using Verble, you agree to these terms and our <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.</p>

            <h2 className="font-headline pt-2 text-xl font-bold text-[#2c2f31]">Playing Verble</h2>
            <p>
              Verble is a daily phrase game for entertainment. Please do not interfere with the game, misuse an
              account, or attempt to disrupt the service. We may restrict access when needed to protect Verble or its
              players.
            </p>

            <h2 className="font-headline pt-2 text-xl font-bold text-[#2c2f31]">Content and availability</h2>
            <p>
              Verble&apos;s design, game, and original content belong to Verble. We may change puzzles, features, or
              availability at any time. The service is provided as available, without a guarantee that it will always
              be uninterrupted or error-free.
            </p>

            <h2 className="font-headline pt-2 text-xl font-bold text-[#2c2f31]">Contact</h2>
            <p>
              For questions or concerns about these terms or Verble content, email
              {" "}<a href="mailto:support@verble.fun" className="underline underline-offset-2">support@verble.fun</a>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
