import React from 'react';
import {
  InfoCard,
  Progress,
  WarningPanel,
} from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  kubernetesApiRef,
  ObjectsByEntityResponse,
} from '@backstage/plugin-kubernetes-react';
import { useApi } from '@backstage/core-plugin-api';
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
} from '@material-ui/core';

type ReleaseInfo = {
  env: string;              // e.g. "prod"
  namespace: string;        // k8s namespace
  currentVersion: string;
  currentImage: string;
  deployedAt?: string;      // ISO string
  previousVersion?: string;
  history: string[];        // older versions (newest → oldest)
};

const parseVersionFromImage = (image?: string): string => {
  if (!image) return 'unknown';
  const parts = image.split(':');
  if (parts.length < 2) return 'latest';
  return parts[parts.length - 1];
};

const getProdNamespace = (namespaces: string[], entityAnnotations: Record<string, string>): string | undefined => {
  // First, prefer explicit prod namespace if given
  const explicit = entityAnnotations['trinet.io/prod-namespace'];
  if (explicit && namespaces.includes(explicit)) {
    return explicit;
  }

  // Fallback: best guess namespace containing "prod"
  const prodNs = namespaces.find(ns =>
    ns.toLowerCase().includes('prod'),
  );
  return prodNs;
};

const buildReleaseInfo = (
  k8sObjects: ObjectsByEntityResponse,
  entityAnnotations: Record<string, string>,
): ReleaseInfo | undefined => {
  const clusters = k8sObjects.items ?? [];

  // Collect all replicaSets across clusters, keyed by namespace
  const rsByNamespace = new Map<string, any[]>();

  for (const cluster of clusters) {
    const replicaSets = cluster.resources?.replicaSets?.resources ?? [];
    for (const rs of replicaSets) {
      const ns = rs.metadata?.namespace ?? 'default';
      if (!rsByNamespace.has(ns)) {
        rsByNamespace.set(ns, []);
      }
      rsByNamespace.get(ns)!.push(rs);
    }
  }

  if (rsByNamespace.size === 0) {
    return undefined;
  }

  const allNamespaces = Array.from(rsByNamespace.keys());
  const prodNamespace = getProdNamespace(allNamespaces, entityAnnotations);

  if (!prodNamespace) {
    return undefined;
  }

  const prodReplicaSets = rsByNamespace.get(prodNamespace) ?? [];
  if (prodReplicaSets.length === 0) {
    return undefined;
  }

  // Sort newest → oldest by creationTimestamp
  prodReplicaSets.sort((a, b) => {
    const ta = new Date(a.metadata?.creationTimestamp ?? 0).getTime();
    const tb = new Date(b.metadata?.creationTimestamp ?? 0).getTime();
    return tb - ta;
  });

  const latest = prodReplicaSets[0];
  const previous = prodReplicaSets[1];

  const latestImage =
    latest.spec?.template?.spec?.containers?.[0]?.image ?? '';
  const previousImage =
    previous?.spec?.template?.spec?.containers?.[0]?.image ?? '';

  const historyVersions = prodReplicaSets.map(rs =>
    parseVersionFromImage(
      rs.spec?.template?.spec?.containers?.[0]?.image,
    ),
  );

  return {
    env: 'prod',
    namespace: prodNamespace,
    currentVersion: parseVersionFromImage(latestImage),
    currentImage: latestImage,
    deployedAt: latest.metadata?.creationTimestamp,
    previousVersion: previousImage
      ? parseVersionFromImage(previousImage)
      : undefined,
    history: historyVersions,
  };
};

export const ReleasesCard = () => {
  const { entity } = useEntity();
  const k8sApi = useApi(kubernetesApiRef);

  const [releaseInfo, setReleaseInfo] = React.useState<ReleaseInfo>();
  const [error, setError] = React.useState<Error | undefined>();
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const k8sObjects = await k8sApi.getObjectsByEntity({
          entity,
        });
        if (cancelled) return;

        const annotations = (entity.metadata.annotations ??
          {}) as Record<string, string>;

        const info = buildReleaseInfo(k8sObjects, annotations);
        setReleaseInfo(info);
        setError(undefined);
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [entity, k8sApi]);

  if (loading) {
    return (
      <InfoCard title="Releases">
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <WarningPanel title="Failed to load release information">
        {error.message}
      </WarningPanel>
    );
  }

  if (!releaseInfo) {
    return (
      <InfoCard title="Releases">
        <Typography variant="body2">
          No production release information found. Check that
          Kubernetes workloads exist and that the prod namespace is
          correctly annotated.
        </Typography>
      </InfoCard>
    );
  }

  const {
    env,
    namespace,
    currentVersion,
    currentImage,
    deployedAt,
    previousVersion,
    history,
  } = releaseInfo;

  return (
    <InfoCard title="Releases">
      <Typography variant="subtitle2" gutterBottom>
        Environment: <strong>{env}</strong> (namespace: {namespace})
      </Typography>

      <Typography variant="body1">
        <strong>Current version:</strong> {currentVersion}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Image: <code>{currentImage}</code>
      </Typography>

      <Typography variant="body1" style={{ marginTop: 8 }}>
        <strong>Previous version:</strong>{' '}
        {previousVersion ?? 'N/A'}
      </Typography>

      <Typography variant="body1" style={{ marginTop: 8 }}>
        <strong>Last prod deployment:</strong>{' '}
        {deployedAt
          ? new Date(deployedAt).toLocaleString()
          : 'Unknown'}
      </Typography>

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="subtitle2" gutterBottom>
        Recent prod versions (newest → oldest)
      </Typography>
      {history.length === 0 ? (
        <Typography variant="body2">No history found.</Typography>
      ) : (
        <List dense>
          {history.slice(0, 10).map((v, i) => (
            <ListItem key={i}>
              <ListItemText primary={v} />
            </ListItem>
          ))}
        </List>
      )}
    </InfoCard>
  );
};

