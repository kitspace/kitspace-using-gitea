import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

import Page from '@components/Page'

const OneClickBom = () => (
  <Page title="1-click-bom">
    <p style={{ textAlign: 'center', minHeight: 86 }}>
      <a href="https://chrome.google.com/webstore/detail/1clickbom/mflpmlediakefinapghmabapjeippfdi">
        <Image
          height={200}
          width={400}
          objectFit="scale-down"
          src="/static/images/chrome.png"
          alt="chrome extension marketplace"
        />
      </a>
      <a href="https://addons.mozilla.org/firefox/downloads/latest/634060/addon-634060-latest.xpi">
        <Image
          height={200}
          width={400}
          objectFit="scale-down"
          src="/static/images/firefox.png"
          alt="firefox extension marketplace"
        />
      </a>
    </p>
    <p>
      1-click BOM is a browser extension that fills your shopping carts for you on
      sites like Digikey and Mouser. It lets you simply click on the &quot;buy
      parts&quot; links on Kitspace to get the right parts. You can also use it
      directly with your own spreadsheets or with our{' '}
      <Link href="/bom-builder">BOM Builder</Link> tool.
    </p>
    <p>
      <a href="https://github.com/kitspace/1clickBOM#readme">
        Read further documentation on GitHub
      </a>
    </p>
    <p style={{ textAlign: 'center', marginTop: 10, minHeight: 454 }}>
      <Image
        height={450}
        width={600}
        objectFit="scale-down"
        src="/static/images/demo.gif"
        alt="demo"
      />
    </p>
  </Page>
)

export default OneClickBom
