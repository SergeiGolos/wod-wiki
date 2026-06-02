import * as Headless from '@headlessui/react'
import React, { forwardRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'

export const Link = forwardRef<HTMLAnchorElement, { href: string } & React.ComponentPropsWithoutRef<'a'>>(
  function Link(props, ref) {
    return (
      <Headless.DataInteractive>
        <RouterLink {...props} to={props.href} ref={ref} />
      </Headless.DataInteractive>
    )
  }
)
