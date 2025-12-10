import React from 'react';
import { ScaffolderPage } from '@backstage/plugin-scaffolder';
import { InfraFeaturesFieldExtension } from './InfraFeaturesField';

export const CustomScaffolderPage = () => {
  return (
    <ScaffolderPage
      fieldExtensions={[InfraFeaturesFieldExtension]}
    />
  );
};

