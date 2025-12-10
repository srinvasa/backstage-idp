import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Switch,
  FormControlLabel,
  Typography,
} from '@material-ui/core';
import {
  FieldExtensionComponentProps,
  createScaffolderFieldExtension,
} from '@backstage/plugin-scaffolder-react';

type InfraValues = {
  eks?: boolean;
  database?: boolean;
  messaging?: boolean;
  elasticache?: boolean;
  s3?: boolean;
  lambda?: boolean;
};

const InfraFeaturesField = (
  props: FieldExtensionComponentProps<InfraValues>,
) => {
  const { formData = {}, onChange } = props;

  const handleToggle =
    (key: keyof InfraValues) =>
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      onChange({ ...formData, [key]: checked });
    };

  const renderToggle = (
    key: keyof InfraValues,
    label: string,
    helper?: string,
  ) => (
    <FormControlLabel
      key={key}
      control={
        <Switch
          color="primary"
          checked={!!formData[key]}
          onChange={handleToggle(key)}
        />
      }
      label={
        <div>
          <Typography variant="subtitle1">{label}</Typography>
          {helper && (
            <Typography variant="caption" color="textSecondary">
              {helper}
            </Typography>
          )}
        </div>
      }
    />
  );

  return (
    <Card elevation={3}>
      <CardHeader
        title="Infrastructure components"
        subheader="Turn on the components you want to manage for this environment."
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            {renderToggle('eks', 'EKS', 'Kubernetes workloads & services')}
            {renderToggle('database', 'Database', 'RDS / Aurora schemas')}
            {renderToggle('messaging', 'Messaging', 'Kafka / other queues')}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderToggle('elasticache', 'ElastiCache', 'Redis cache')}
            {renderToggle('s3', 'S3', 'Buckets & object storage')}
            {renderToggle('lambda', 'Lambda', 'Event-driven functions')}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export const InfraFeaturesFieldExtension =
  createScaffolderFieldExtension<InfraValues>({
    name: 'InfraFeatures', // 👈 MUST match uiSchema 'ui:field'
    component: InfraFeaturesField,
  });

