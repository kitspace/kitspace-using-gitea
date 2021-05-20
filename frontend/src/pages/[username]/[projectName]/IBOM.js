import React, { useEffect } from 'react'
import { promises as fs } from 'fs'
import path from 'path'
import NextHead from 'next/head'

import { Page } from '@components/Page'

export const getServerSideProps = async ({ params }) => {
  const basePath = 'src/IBOM'
  const IBOMHtml = await fs.readFile(
    path.join(process.cwd(), `${basePath}/index.html`),
    'utf-8',
  )

  const processorUrl = process.env.KITSPACE_PROCESSOR_URL
  const repoFullname = `${params.username}/${params.projectName}`
  const interactiveBOMStatus = await fetch(
    `${processorUrl}/status/${repoFullname}/HEAD/interactive_bom.json`,
  ).then(r => r.json().then(body => body.status))


  if (interactiveBOMStatus === 'done') {
    const pcbData = await fetch(
    `${processorUrl}/files/${repoFullname}/HEAD/interactive_bom.json`,
    ).then(res => res.blob().then(b => b.text()))
    return {

      props: { html: IBOMHtml, pcbData},
    }
  } else {
    return {
      notFound: true
    }
  }
}

const IBOM = ({ html, pcbData }) => {
  const config = {
    dark_mode: false,
    show_pads: true,
    show_fabrication: false,
    show_silkscreen: true,
    highlight_pin1: true,
    redraw_on_drag: true,
    board_rotation: 0,
    checkboxes: 'Sourced,Placed',
    bom_view: 'left-right',
    layer_view: 'FB',
    extra_fields: [],
  }


  const initScript = `
  var pcbdata = ${pcbData};
  document.getElementById('IBOM_script').addEventListener('load', () => {
    window.onresize = resizeAll;
    initBOM();
  });
  `


  useEffect(() => {
    window.config = config

  }, [])

  return (
    <Page>
      <NextHead>
        <script type="text/javascript" src="/static/IBOM/index.js" id="IBOM_script"></script>
        <script type="text/javascript">
          {initScript}
        </script>
        <link rel="stylesheet" href='/static/IBOM/index.css'></link>
      </NextHead>
      <div className="ibom" dangerouslySetInnerHTML={{ __html: html }} />
    </Page>
  )
}

export default IBOM
