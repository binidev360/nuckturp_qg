/// <reference types="npm:@types/react@18.3.1" />
/** Recovery (Password Reset) Email — Nuckturp branded */
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinir sua senha no QG do Mestre</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ padding: '0' }}>
          <Img src="https://nhygqpnhumgxslpoachu.supabase.co/storage/v1/object/public/email-assets/nuckturp-email-header.jpg" alt="QG do Mestre" width="600" style={{ width: '100%', display: 'block' as const, borderRadius: '12px 12px 0 0' }} />
        </Section>
        <Heading style={h1}>Redefinir sua senha</Heading>
        <Text style={text}>Recebemos um pedido para redefinir sua senha no QG do Mestre. Clique no botão abaixo para escolher uma nova senha.</Text>
        <Button style={button} href={confirmationUrl}>Redefinir Senha</Button>
        <Text style={footer}>Se você não solicitou, ignore este e-mail. Sua senha não será alterada.</Text>
        <Section style={footerLinks}><Link href="https://nuckturp.com.br" style={footerLink}>nuckturp.com.br</Link></Section>
      </Container>
    </Body>
  </Html>
)
export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1A1A1A', margin: '24px 25px 12px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 20px' }
const button = { backgroundColor: '#9EFF33', color: '#1A1A1A', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const, margin: '0 25px 24px' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 25px 12px' }
const footerLinks = { textAlign: 'center' as const, padding: '16px 25px 24px', borderTop: '1px solid #e5e5e5', margin: '0 25px' }
const footerLink = { color: '#1A1A1A', fontSize: '12px', textDecoration: 'none' }
