import React from 'react';
import {
  InfoCard,
  Progress,
  WarningPanel,
} from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useKubernetesObjects,
  ObjectsByEntityResponse,
} from '@backstage/plugin-kubernetes-react';
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
} from '@material-ui/core';

type StageReleaseInfo = {
  namespace: string;
  currentVersion: string;
  currentImage: string;
  deployedAt?: string;
  previousVersion?: string;
  history: string[];
};

const parseVersion = (image?: string): string => {
  if (!image) return 'unknown';
  const parts = image.split(':');
  return parts.length > 1 ? parts[parts.length - 1] : 'unknown';
};

const safeArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v.filter(Boolean) as T[]) : [];

const getStageNamespace = (
  namespaces: string[],
  annotations: Record<string, string>,
): string | undefined => {
  const explicit = annotations['trinet.io/stage-namespace'];
  if (explicit && namespaces.includes(explicit)) {
    return explicit;
  }
  return namespaces.find(ns => ns.toLowerCase().includes('stage'));
};

const collectReplicaSets = (objects: ObjectsByEntityResponse): Map<string, any[]> => {
  const rsByNamespace = new Map<string, any[]>();
  const clusters = objects.items ?? [];

  for (const cluster of clusters) {
    if (!cluster) continue;
    const resources: any = (cluster as any).resources;
    if (!resources) continue;

    // format A: resources is an object with replicaSets.{resources|items}
    const rsFromObj =
      safeArray<any>(resources?.replicaSets?.resources).concat(
        safeArray<any>(resources?.replicaSets?.items),
      );

    for (const rs of rsFromObj) {
      const ns = rs?.metadata?.namespace;
      if (!ns) continue;
      if (!rsByNamespace.has(ns)) rsByNamespace.set(ns, []);
      rsByNamespace.get(ns)!.push(rs);
    }

    // format B: resources is an array of { type, resources }
    if (Array.isArray(resources)) {
      for (const group of resources) {
        if (!group || group.type !== 'replicaSets') continue;
        for (const rs of safeArray<any>(group.resources)) {
          const ns = rs?.metadata?.namespace;
          if (!ns) continue;
          if (!rsByNamespace.has(ns)) rsByNamespace.set(ns, []);
          rsByNamespace.get(ns)!.push(rs);
        }
      }
    }
  }

  // filter out any weird/partial records
  for (const [ns, list] of rsByNamespace.entries()) {
    rsByNamespace.set(
      ns,
      list.filter(
        rs =>
          rs &&
          rs.metadata &&
          rs.spec?.template?.spec?.containers?.[0]?.image,
      ),
    );
  }

  return rsByNamespace;
};

const extractStageReleaseInfo = (
  objects: ObjectsByEntityResponse,
  annotations: Record<string, string>,
): StageReleaseInfo | undefined => {
  const rsByNamespace = collectReplicaSets(objects);
  const namespaces = Array.from(rsByNamespace.keys());
  if (namespaces.length === 0) return;

  const stageNs = getStageNamespace(namespaces, annotations);
  if (!stageNs) return;

  const stageRS = rsByNamespace.get(stageNs) ?? [];
  if (stageRS.length === 0) return;

  // newest → oldest by creationTimestamp
  stageRS.sort(
    (a, b) =>
      new Date(b.metadata?.creationTimestamp ?? 0).getTime() -
      new Date(a.metadata?.creationTimestamp ?? 0).getTime(),
  );

  const latest = stageRS[0];
  const previous = stageRS[1];

  const latestImg =
    latest.spec?.template?.spec?.containers?.[0]?.image ?? '';
  const prevImg =
    previous?.spec?.template?.spec?.containers?.[0]?.image ?? '';

  const history = stageRS.map(rs =>
    parseVersion(
      rs.spec?.template?.spec?.containers?.[0]?.image,
    ),
  );

  return {
    namespace: stageNs,
    currentVersion: parseVersion(latestImg),
    currentImage: latestImg,
    deployedAt: latest.metadata?.creationTimestamp,
    previousVersion: prevImg ? parseVersion(prevImg) : undefined,
    history,
  };
};

export const StageReleasesCard = () => {
  const { entity } = useEntity();
  const {
    kubernetesObjects,
    loading,
    error,
  } = useKubernetesObjects(entity);

  if (loading) {
    return (
      <InfoCard title="Stage Releases">
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <WarningPanel title="Failed to load stage release info">
        {error.message}
      </WarningPanel>
    );
  }

  if (!kubernetesObjects) {
    return (
      <InfoCard title="Stage Releases">
        <Typography variant="body2">
          No Kubernetes data available for this service.
        </Typography>
      </InfoCard>
    );
  }

  const annotations =
    (entity.metadata.annotations ?? {}) as Record<string, string>;
  const info = extractStageReleaseInfo(kubernetesObjects, annotations);

  if (!info) {
    return (
      <InfoCard title="Stage Releases">
        <Typography variant="body2">
          No stage release information found.
          <br />
          Check that:
          <br />• Workloads exist in namespace{' '}
          <code>{annotations['trinet.io/stage-namespace'] ?? 'stage-hr-cp'}</code>
          <br />• The Kubernetes tab shows ReplicaSets/Deployments for this service
        </Typography>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Stage Releases">
      <Typography variant="subtitle2" gutterBottom>
        Namespace: <strong>{info.namespace}</strong>
      </Typography>

      <Typography variant="body1">
        <strong>Current Version:</strong> {info.currentVersion}
      </Typography>
      <Typography variant="body2">
        Image: <code>{info.currentImage}</code>
      </Typography>

      <Typography variant="body1" style={{ marginTop: 8 }}>
        <strong>Previous Version:</strong>{' '}
        {info.previousVersion ?? 'N/A'}
      </Typography>

      <Typography variant="body1" style={{ marginTop: 8 }}>
        <strong>Last Stage Deployment:</strong>{' '}
        {info.deployedAt
          ? new Date(info.deployedAt).toLocaleString()
          : 'Unknown'}
      </Typography>

      <Divider style={{ margin: '16px 0' }} />

      <Typography variant="subtitle2">Version History</Typography>
      <List dense>
        {info.history.slice(0, 8).map((v, i) => (
          <ListItem key={i}>
            <ListItemText primary={v} />
          </ListItem>
        ))}
      </List>
    </InfoCard>
  );
};

