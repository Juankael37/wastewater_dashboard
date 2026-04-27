import React from 'react'
import AquaNavigation from './AquaNavigation'
import AquaHeader from './AquaHeader'
import BaseLayout from './BaseLayout'

const AquaLayout: React.FC = () => (
  <BaseLayout header={<AquaHeader />} navigation={<AquaNavigation />} />
)

export default AquaLayout