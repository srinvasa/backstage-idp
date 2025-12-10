// packages/app/src/components/home/HomePage.tsx
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Box,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  IconButton,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import { Link as RouterLink } from 'react-router-dom';
import { Page, Content } from '@backstage/core-components';

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: '100vh',
    padding: theme.spacing(3),
    // background image (put your image into packages/app/public and change URL)
    backgroundImage: 'url(/trinetLogobg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  overlay: {
    background: 'rgba(0,0,0,0.55)',
    borderRadius: theme.shape.borderRadius * 2,
    padding: theme.spacing(4),
  },
  announcement: {
    position: 'absolute',
    top: theme.spacing(2),
    right: theme.spacing(4),
    background: 'linear-gradient(135deg,#ff4b6e,#ff0066)',
    color: '#fff',
    padding: theme.spacing(1.5, 3),
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    zIndex: 2,
  },
  announcementText: {
    fontWeight: 600,
    marginRight: theme.spacing(1),
  },
  titleChip: {
    display: 'inline-block',
    padding: theme.spacing(0.75, 3),
    borderRadius: 999,
    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
    color: '#fff',
    fontWeight: 600,
    marginBottom: theme.spacing(3),
  },
  tileCard: {
    height: '100%',
    borderRadius: 16,
    boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
  },
  tileContent: {
    padding: theme.spacing(2.5),
  },
  tileTitle: {
    color: '#fff',
    fontWeight: 700,
    marginBottom: theme.spacing(0.5),
  },
  tileSubtitle: {
    color: 'rgba(255,255,255,0.9)',
  },
}));

type Tile = {
  title: string;
  subtitle: string;
  to: string;
  background: string;
};

const tiles: Tile[] = [
  {
    title: 'Component',
    subtitle: 'Explore components',
    to: '/catalog?filters%5Bkind%5D=component',
    background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
  },
  {
    title: 'SelfServe',
    subtitle: 'Microservice Onboarding Automation',
    to: '/templates?filters[type]=automation',
    background: 'linear-gradient(135deg,#a855f7,#ec4899)',
  },
  {
    title: 'Group',
    subtitle: 'View groups',
    to: '/catalog?filters%5Bkind%5D=group',
    background: 'linear-gradient(135deg,#0ea5e9,#22c55e)',
  },
  {
    title: 'Template',
    subtitle: 'Browse templates',
    to: '/create',
    background: 'linear-gradient(135deg,#f59e0b,#eab308)',
  },
  {
    title: 'API',
    subtitle: 'Access APIs',
    to: '/api-docs',
    background: 'linear-gradient(135deg,#16a34a,#22c55e)',
  },
  {
    title: 'Location',
    subtitle: 'Find locations',
    to: '/catalog?filters%5Bkind%5D=location',
    background: 'linear-gradient(135deg,#f97316,#facc15)',
  },
  {
    title: 'User',
    subtitle: 'Manage users',
    to: '/catalog?filters%5Bkind%5D=user',
    background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
  },
  {
    title: 'Docs',
    subtitle: 'Check TechDocs',
    to: '/docs',
    background: 'linear-gradient(135deg,#ef4444,#f97316)',
  },
];

export const HomePage = () => {
  const classes = useStyles();
  const [showAnnouncement, setShowAnnouncement] = React.useState(true);

  return (
    <Page themeId="home">
      <Content>
        <Box position="relative" className={classes.root}>
          {showAnnouncement && (
            <Box className={classes.announcement}>
              <span className={classes.announcementText}>Announcements</span>
              <IconButton
                size="small"
                onClick={() => setShowAnnouncement(false)}
                style={{ color: '#fff' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Box className={classes.overlay}>
            <Box textAlign="center" mb={3}>
              <span className={classes.titleChip} style={{ fontSize: '1.75rem' }}>TriNet Developer Portal</span>
            </Box>

            <Grid container spacing={3}>
              {tiles.map(tile => (
                <Grid item xs={12} sm={6} md={3} key={tile.title}>
                  <Card
                    className={classes.tileCard}
                    style={{ background: tile.background }}
                  >
                    <CardActionArea
                      component={RouterLink}
                      to={tile.to}
                    >
                      <CardContent className={classes.tileContent}>
                        <Typography
                          variant="h6"
                          className={classes.tileTitle}
                        >
                          {tile.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          className={classes.tileSubtitle}
                        >
                          {tile.subtitle}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Content>
    </Page>
  );
};

