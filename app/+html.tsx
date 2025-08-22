import React from 'react';

const { Html, Head, Main, Scripts } = require('expo-router/html') as {
  Html: React.ComponentType<any>;
  Head: React.ComponentType<any>;
  Main: React.ComponentType<any>;
  Scripts: React.ComponentType<any>;
};

export default function RootHTML() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <Scripts />
      </body>
    </Html>
  );
}
