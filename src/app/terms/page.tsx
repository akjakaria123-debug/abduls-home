import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/lib/legal';
import { Bullets, LegalPage, Section } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: `Terms of Service — ${LEGAL.productName}`,
  description: 'The agreement between you and us for using this service.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are the agreement between you and {LEGAL.legalEntityName} (ABN {LEGAL.abn}) for
        your use of {LEGAL.productName}. By creating an account you accept them.
      </p>

      <Section heading="What the service does">
        <p>
          {LEGAL.productName} writes social media posts for your business using AI, schedules them,
          and publishes them to the Facebook Pages you connect, through Meta&rsquo;s official
          Graph API.
        </p>
      </Section>

      <Section heading="Your account">
        <Bullets
          items={[
            'You must be at least 18 and able to enter a contract.',
            'You are responsible for keeping your password secure and for everything done through your account.',
            'You must give accurate business information. The quality of your posts depends on it.',
            'One account is for one business unless your plan says otherwise.',
          ]}
        />
      </Section>

      <Section heading="You are responsible for what gets published">
        <p>
          This matters, so we are putting it plainly. Our AI writes drafts. Whatever is published
          to your Facebook Page is published in your business&rsquo;s name and is your
          responsibility, whether or not you read it first.
        </p>
        <Bullets
          items={[
            'AI can make mistakes, including stating things that are not true about your business.',
            'If you turn on auto-pilot, posts publish without you seeing them. That is your choice and your risk.',
            'You must not publish anything misleading about your prices, products or services. Australian Consumer Law applies to your posts.',
            'Check any post that mentions a price, a discount, a guarantee, a health or medical claim, or a professional qualification before it goes out.',
          ]}
        />
        <p>
          We recommend keeping approval mode on until you trust the output. You can review and edit
          every post before it publishes.
        </p>
      </Section>

      <Section heading="Facebook and Meta">
        <Bullets
          items={[
            'You must own or be an authorised administrator of any Facebook Page you connect.',
            "Your use of Facebook is also governed by Meta's own terms and policies.",
            'We connect only through official Meta APIs. We do not automate Facebook in any way Meta prohibits.',
            'Meta can change or withdraw its API at any time. If that stops part of our service working, we will tell you, but it is outside our control.',
          ]}
        />
      </Section>

      <Section heading="Free trial, payment and cancellation">
        <Bullets
          items={[
            'New accounts get a 7-day free trial. No card is required to start it.',
            'After the trial you must choose a paid plan to keep using the service.',
            'Subscriptions are billed monthly in advance in Australian dollars through Stripe.',
            'You can cancel at any time. Your plan keeps working until the end of the period you have already paid for.',
            'We do not give refunds for partial months, except where the Australian Consumer Law requires it.',
            'If a payment fails we will retry it and email you. If it keeps failing we may suspend your account.',
            'We may change our prices. Existing subscribers get at least 30 days notice by email.',
          ]}
        />
      </Section>

      <Section heading="Acceptable use">
        <p>You must not use the service to:</p>
        <Bullets
          items={[
            'Publish anything unlawful, misleading, hateful, harassing or obscene.',
            'Impersonate another business or person.',
            'Publish on behalf of a Page you are not authorised to manage.',
            'Send spam or content that breaches Meta policies.',
            'Attempt to break, overload, or gain unauthorised access to the service.',
            'Resell the service without our written agreement.',
          ]}
        />
        <p>
          We may suspend or close an account that breaches these rules. Where we can, we will warn
          you first.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          We work to keep the service running but we do not promise it will never be unavailable.
          Maintenance, faults, and outages at Meta, our hosting providers or our AI provider can all
          interrupt it. We do not guarantee that every scheduled post will publish at the exact
          minute scheduled.
        </p>
      </Section>

      <Section heading="Your content">
        <p>
          Your business information and the posts generated for you remain yours. You give us
          permission to store and process them only so we can run the service for you. We may use
          anonymous, aggregated statistics to improve the product.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          Nothing in these terms excludes rights you have under the Australian Consumer Law. Our
          goods and services come with guarantees that cannot be excluded.
        </p>
        <p>
          Beyond those guarantees, and to the extent the law allows, our total liability to you for
          any claim is limited to the amount you paid us in the three months before the claim arose.
          We are not liable for lost profits, lost business, or damage to your reputation arising
          from content published through the service.
        </p>
      </Section>

      <Section heading="Ending the agreement">
        <p>
          You can close your account at any time from Billing. We may close your account if you
          breach these terms, if you do not pay, or if we stop offering the service — in which case
          we will give you reasonable notice and refund any unused prepaid period.
        </p>
        <p>
          See our{' '}
          <Link href="/data-deletion" className="text-brand-600 hover:underline">
            data deletion page
          </Link>{' '}
          for what happens to your information afterwards.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of {LEGAL.governingState}, Australia, and you and we
          submit to the courts of that state.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about these terms:{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-brand-600 hover:underline">
            {LEGAL.contactEmail}
          </a>
        </p>
      </Section>
    </LegalPage>
  );
}
