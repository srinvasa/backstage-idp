// packages/app/src/components/home/HomePage.tsx
import React from 'react';
import { Grid, Typography, Button } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { Content, Page, Header, HeaderLabel } from '@backstage/core-components';

export const HomePage = () => {   // 👈 named export
  return (
    <Page themeId="home">
      <Header title="Welcome to Backstage" subtitle="Your developer portal">
        <HeaderLabel label="Owner" value="Platform Automation" />
        <HeaderLabel label="Environment" value="Stage" />
      </Header>

      <Content>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" gutterBottom>
              Hello 👋
            </Typography>
            <Typography variant="body1" paragraph>
              Use this portal to discover services, view docs, and manage deployments.
            </Typography>

            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/catalog"
            >
              Go to Catalog
            </Button>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};

