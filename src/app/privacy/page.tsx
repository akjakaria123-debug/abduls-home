import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/lib/legal';
import { Bullets, LegalPage, Section } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: `Privacy Policy — ${LEGAL.productName}`,
  description: 'How we collect, use and protect your information.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what {LEGAL.legalEntityName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects when you use {LEGAL.productName}, why we collect it, and what you can do about
        it. We handle personal information in line with the Australian Privacy Principles under
        the <em>Privacy Act 1988</em> (Cth).
      </p>

      <Section heading="What we collect">
        <p>
          <strong>Information you give us.</strong> Your name and email address when you create an
          account, and the business details you enter — business name, category, description,
          website, phone number, location, the customers you serve, your products and services,
          your offers, and your preferred tone and language.
        </p>
        <p>
          <strong>Information from Facebook.</strong> When you connect your Facebook account
          through Meta&rsquo;s official login, we receive a list of the Facebook Pages you manage,
          their names and IDs, and access tokens that let us post to the Pages you choose. For
          posts we publish on your behalf, we also retrieve engagement figures such as reach,
          reactions, comments and shares.
        </p>
        <p>
          <strong>Information we generate.</strong> The posts our AI writes for you, their
          schedules, and records of whether each one published successfully.
        </p>
        <p>
          <strong>Payment information.</strong> Handled entirely by Stripe. We never see or store
          your card number. We keep only your subscription status and a Stripe customer reference.
        </p>
      </Section>

      <Section heading="What we don't collect">
        <Bullets
          items={[
            'We never ask for or store your Facebook password.',
            'We never read your personal Facebook profile, friends list, or private messages.',
            'We never store your credit card details.',
          ]}
        />
      </Section>

      <Section heading="How we use it">
        <Bullets
          items={[
            'To write social media posts matched to your business.',
            'To publish those posts to the Facebook Pages you have chosen, at the times you set.',
            'To show you how your published posts performed.',
            'To run your subscription and take payment.',
            'To contact you about your account, including when a post fails to publish.',
            'To find and fix faults in the service.',
          ]}
        />
        <p>
          We do not sell your information. We do not use your business information to train AI
          models of our own.
        </p>
      </Section>

      <Section heading="Who else handles your information">
        <p>We use these providers to run the service. Each one only receives what it needs:</p>
        <Bullets
          items={[
            'Supabase — stores your account, business details and posts.',
            'Vercel — hosts the website.',
            'Meta (Facebook) — receives the posts we publish for you, and returns performance figures.',
            'OpenAI — receives your business details in order to write your posts.',
            'Stripe — processes subscription payments.',
          ]}
        />
        <p>
          Some of these providers store or process data outside Australia. By using the service you
          agree to that transfer. We choose providers that offer comparable protection to the
          Australian Privacy Principles.
        </p>
      </Section>

      <Section heading="How we protect your Facebook access">
        <p>
          Facebook access tokens are encrypted before they are stored, using AES-256-GCM. They are
          decrypted only at the moment we publish a post or read performance figures for you. They
          are never sent to your browser and never exposed to other customers.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          We keep your account and business information for as long as your account is open. If you
          close your account we delete your personal information within 30 days, except where we
          must keep records longer to meet Australian tax or accounting obligations — typically
          transaction records for seven years.
        </p>
        <p>
          Disconnecting Facebook removes your stored access tokens and Page details immediately.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>You can, at any time:</p>
        <Bullets
          items={[
            'See the information we hold about you.',
            'Correct anything that is wrong — most of it you can edit yourself in Settings.',
            'Disconnect Facebook, which removes our access to your Pages.',
            'Close your account and have your information deleted.',
            'Ask us to explain how we handled your information.',
          ]}
        />
        <p>
          To exercise any of these, email us at{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-brand-600 hover:underline">
            {LEGAL.contactEmail}
          </a>
          . See our{' '}
          <Link href="/data-deletion" className="text-brand-600 hover:underline">
            data deletion page
          </Link>{' '}
          for how to remove your data.
        </p>
      </Section>

      <Section heading="Complaints">
        <p>
          If you think we have mishandled your information, email us first and we will respond
          within 30 days. If you are not satisfied with our response you can complain to the Office
          of the Australian Information Commissioner at oaic.gov.au.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If we change this policy we will update the date at the top of this page, and tell you by
          email if the change materially affects you.
        </p>
      </Section>

      <Section heading="Contact us">
        <p>
          {LEGAL.legalEntityName} (ABN {LEGAL.abn})
          <br />
          {LEGAL.address}
          <br />
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-brand-600 hover:underline">
            {LEGAL.contactEmail}
          </a>
        </p>
      </Section>
    </LegalPage>
  );
}
