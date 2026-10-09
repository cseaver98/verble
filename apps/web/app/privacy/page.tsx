import Link from "next/link";
import MainNav from "../verble/components/MainNav";

export default function PrivacyPage() {
  return (
    <>
      <MainNav label="Privacy Policy" />
      <main className="min-h-screen bg-transparent px-5 pb-12 text-[#2c2f31] sm:px-8">
        <section className="mx-auto mt-6 max-w-4xl rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(44,47,49,0.06)] sm:p-10">
          <h1 className="font-headline text-3xl font-extrabold text-[#2c2f31]">Privacy Policy</h1>
          <p className="mt-2 text-sm text-[#595c5e]">Last updated October 9, 2026.</p>

          <div className="mt-6 space-y-4 text-[15px] leading-7 text-[#3e4245]">
            <p>Verble uses the information needed to run the daily phrase game, save progress, and improve the service.</p>

            <h2 className="font-headline pt-2 text-xl font-bold text-[#2c2f31]">What we collect</h2>
            <p>
              We collect game progress and results, basic usage and device information, and any account details you
              provide, such as your email address and display name. Cookies and browser storage help keep you signed in
              and remember your progress.
            </p>
            <p>
              If you sign in with Google or Apple, we receive the basic account details they provide and use them to
              create and secure your Verble account. We do not access your messages, contacts, or files.
            </p>

            <h2 className="font-headline pt-2 text-xl font-bold text-[#2c2f31]">How we use it</h2>
            <p>
              We use this information to provide the game and your stats, maintain security, understand how Verble is
              used, and send reminders or updates if you choose to receive them. Providers that handle hosting,
              sign-in, email, and analytics process information for us. We do not sell your personal information.
            </p>

            <h2 className="font-headline pt-2 text-xl font-bold text-[#2c2f31]">Your choices</h2>
            <p>
              You can update your profile and email preferences in your <Link href="/account" className="underline underline-offset-2">account</Link>
              {" "}or unsubscribe from an email. You can clear data stored in your browser. To request access,
              correction, or deletion of account data, email <a href="mailto:support@verble.fun" className="underline underline-offset-2">support@verble.fun</a>.
              We retain information as needed to operate Verble or meet legal obligations. If this policy changes,
              we will update the date above.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
