import Image from "next/image";
import Link from "next/link";
import { PlanGrid } from "./PlanGrid";
import { Brand } from "./ui";

export function Landing() {
  return (
    <main className="landing">
      <header className="site-header page-width">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#plans">Plans</a>
          <Link href="/auth">Sign in</Link>
        </nav>
      </header>

      <section className="hero page-width" aria-labelledby="hero-title">
        <div className="hero__copy">
          <h1 id="hero-title">AI counts tokens.<br />We make moments count.</h1>
          <p>Fill a Jar with your words, photos, and voice. Give someone a piece of you to open when they need you.</p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/auth?mode=signup">Create your Jar</Link>
            <a href="#how-it-works">See how it works</a>
          </div>
        </div>
        <div className="hero__art" aria-label="An illustrated jar full of folded letters">
          <Image
            alt="A glowing illustrated jar filled with small envelopes"
            src="/jar-illustration.png"
            width={720}
            height={720}
            priority
            sizes="(max-width: 760px) 92vw, 48vw"
          />
          <span className="scribble scribble--hero">A little jar<br />of you.</span>
        </div>
      </section>

      <section className="how page-width" id="how-it-works" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <ol>
          <li>
            <span>1</span>
            <div><h3>Add your words</h3><p>Write letters, add photos, and record voice notes.</p></div>
          </li>
          <li>
            <span>2</span>
            <div><h3>Send it to your Circle</h3><p>Connect by username, then choose someone in your Circle.</p></div>
          </li>
          <li>
            <span>3</span>
            <div><h3>They open when ready</h3><p>Each little envelope is there for the moment they need it.</p></div>
          </li>
        </ol>
      </section>

      <section className="included page-width" id="included" aria-labelledby="included-heading">
        <div className="included__paper included__paper--left">Same love.<br />New moments.<br />Whenever they need them.</div>
        <div>
          <h2 id="included-heading">Letters, photos and voice notes.<br />All in one special jar.</h2>
          <p>A personal digital gift — easy to create, beautifully simple to receive.</p>
          <p>Pay once for your seats. Each member can send 10 Jars, hosted for three years from sealing.</p>
        </div>
        <div className="included__paper">For the good days,<br />the hard days,<br />and everything in between.</div>
      </section>

      <section className="plans page-width" id="plans" aria-labelledby="plans-heading">
        <div className="plans__heading"><span className="paper-sprig" aria-hidden="true">❦</span><h2 id="plans-heading">Choose how many people<br />can share the experience.</h2><p>One payment for all seats. Every member gets 10 Jars to send to their Circle.</p></div>
        <PlanGrid />
      </section>

      <footer className="site-footer page-width">
        <Brand />
        <p>Private by design. One-time purchase. No subscription.</p>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund-policy">Refunds</Link></div>
      </footer>
    </main>
  );
}
