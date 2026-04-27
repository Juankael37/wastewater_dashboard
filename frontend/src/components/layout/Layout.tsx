import React from 'react'
import Navigation from './Navigation'
import Header from './Header'
import BaseLayout from './BaseLayout'

const Layout: React.FC = () => (
  <BaseLayout header={<Header />} navigation={<Navigation />} />
)

export default Layout