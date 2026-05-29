/// <reference types="npm:@types/react@18.3.1" />

/**
 * Signup Confirmation Email — Nuckturp branded
 * Visual identity: Noir Void + Cyber Lime + Space Grotesk
 */

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail no QG do Mestre</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Img
            src="https://nhygqpnhumgxslpoachu.supabase.co/storage/v1/object/public/email-assets/nuckturp-email-header.jpg"
            alt="QG do Mestre — Nuckturp"
            width="600"
            style={headerImg}
          />
        </Section>
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>
          Bem-vindo ao{' '}
          <Link href={siteUrl} style={link}><strong>QG do Mestre</strong></Link>! 🎲
        </Text>
        <Text style={text}>
          Confirme seu e-mail ({recipient}) clicando no botão abaixo:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar E-mail
        </Button>
        <Text style={footer}>
          Se você não criou uma conta, ignore este e-mail com segurança.
        </Text>
        <Section style={footerLinks}>
          <Link href={siteUrl} style={footerLink}>nuckturp.com.br</Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px' }
const headerSection = { padding: '0' }
const headerImg = { width: '100%', display: 'block' as const, borderRadius: '12px 12px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1A1A1A', margin: '24px 25px 12px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 20px' }
const link = { color: '#1A1A1A', textDecoration: 'underline' }
const button = {
  backgroundColor: '#9EFF33', color: '#1A1A1A', fontSize: '14px', fontWeight: 'bold' as const,
  borderRadius: '8px', padding: '12px 24px', textDecoration: 'none',
  display: 'block' as const, textAlign: 'center' as const, margin: '0 25px 24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '20px 25px 12px' }
const footerLinks = { textAlign: 'center' as const, padding: '16px 25px 24px', borderTop: '1px solid #e5e5e5', margin: '0 25px' }
const footerLink = { color: '#1A1A1A', fontSize: '12px', textDecoration: 'none' }
