import { Header } from '../../layouts/Header'
import './KnktFund.css'

export function KnktFund() {
  return (
    <main className="knktfund-page">
      <Header />

      <section className="knktfund-content" aria-labelledby="knktfund-title">
        <div className="knktfund-brand" aria-hidden="true">
          <img src="/assets/logo_icons/app_logo.png" alt="" />
          <strong>NKT</strong>
          <span>Fund</span>
        </div>

        <article className="knktfund-copy">
          <h1 id="knktfund-title">Welcome to the Heart of SocialKnkt: The Knkt Fund</h1>

          <p>
            At SocialKnkt, we believe in the power of community to create positive change.
            The idea that sparked SocialKnkt was simple yet profound: to extend a helping hand
            to those who need it most. And that&apos;s where the Knkt Fund comes in — a testament
            to our commitment to making a real difference in the world. The Knkt Fund is where
            this mission comes to life.
          </p>

          <p>
            Imagine a community where your voice matters, where you have a say in shaping the
            future. As our SocialKnkt family grows, we&apos;ll soon open the doors to the Knkt Fund.
            Every three months – a new season of giving – you, our valued members, will have the
            opportunity to vote for a nonprofit organization that resonates with you.
          </p>

          <p>
            At the end of each voting period, we&apos;ll proudly donate 10% of SocialKnkt&apos;s profits
            to the chosen nonprofit. It&apos;s a tangible way for us to give back, to turn our
            collective success into a force for good. And then, a new voting cycle will begin,
            a fresh opportunity to discover and uplift another deserving organization.
          </p>

          <p>
            We invite you to join our growing family and help us make a lasting impact. Together,
            we can build a brighter future, one act of kindness at a time.
          </p>

          <p>Stay tuned for more updates on SocialKnkt and the launch of the Knkt Fund!</p>
        </article>
      </section>
    </main>
  )
}
