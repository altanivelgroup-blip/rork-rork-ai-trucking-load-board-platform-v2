import React from 'react';

const html = require('expo-router/html') as any;
const Html: React.ComponentType<any> = html.Html;
const Head: React.ComponentType<any> = html.Head;
const Main: React.ComponentType<any> = html.Main;
const Scripts: React.ComponentType<any> = html.Scripts;

export default function RootHTML() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
        <meta name="theme-color" content="#0b1220" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <title>AI Trucking Load Board</title>
      </Head>
      <body>
        <Main />
        <Scripts />
      </body>
    </Html>
  );
}
