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
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Box,
  Button,
} from '@material-ui/core';

type StageReleaseRow = {
  version: string;
  createdAt: string;
};

type StageReleaseInfo = {
  namespace: string;
  currentVersion: string;
  deployedAt?: string;
  previousVersion?: string;
  rows: StageReleaseRow[];
};

const safeArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v.filter(Boolean) as T[]) : [];

const parseVersionFromImage = (image?: string): string => {
  if (!image) return 'unknown';
  const parts = image.split(':');
  return parts.length > 1 ? parts[parts.length - 1] : 'unknown';
};

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

const collectReplicaSetsByNamespace = (
  objects: ObjectsByEntityResponse,
): Map<string, any[]> => {
  const rsByNamespace = new Map<string, any[]>();
  const clusters = objects.items ?? [];

  for (const cluster of clusters) {
    const groups: any = (cluster as any).resources;
    if (!Array.isArray(groups)) continue;

    for (const group of groups) {
      if (!group || typeof group !== 'object') continue;
      const t = String(group.type || '').toLowerCase();
      if (t !== 'replicasets') continue;

      for (const rs of safeArray<any>(group.resources)) {
        const ns = rs?.metadata?.namespace;
        const image =
          rs?.spec?.template?.spec?.containers?.[0]?.image;
        if (!ns || !image) continue;

        if (!rsByNamespace.has(ns)) rsByNamespace.set(ns, []);
        rsByNamespace.get(ns)!.push(rs);
      }
    }
  }

  return rsByNamespace;
};

const extractStageReleaseInfo = (
  objects: ObjectsByEntityResponse,
  annotations: Record<string, string>,
): StageReleaseInfo | undefined => {
  const rsByNamespace = collectReplicaSetsByNamespace(objects);
  const namespaces = Array.from(rsByNamespace.keys());
  if (namespaces.length === 0) return;

  const stageNs = getStageNamespace(namespaces, annotations);
  if (!stageNs) return;

  const stageRS = rsByNamespace.get(stageNs) ?? [];
  if (stageRS.length === 0) return;

  // newest → oldest
  stageRS.sort(
    (a, b) =>
      new Date(b.metadata.creationTimestamp).getTime() -
      new Date(a.metadata.creationTimestamp).getTime(),
  );

  const latest = stageRS[0];
  const previous = stageRS[1];

  const rows: StageReleaseRow[] = stageRS.map(rs => {
    const image =
      rs.spec?.template?.spec?.containers?.[0]?.image ?? '';
    return {
      version: parseVersionFromImage(image),
      createdAt: rs.metadata?.creationTimestamp ?? '',
    };
  });

  return {
    namespace: stageNs,
    currentVersion: parseVersionFromImage(
      latest.spec?.template?.spec?.containers?.[0]?.image,
    ),
    deployedAt: latest.metadata?.creationTimestamp,
    previousVersion: previous
      ? parseVersionFromImage(
          previous.spec?.template?.spec?.containers?.[0]?.image,
        )
      : undefined,
    rows,
  };
};

export const StageReleasesCard = () => {
  const { entity } = useEntity();
  const k8sApi = useApi(kubernetesApiRef);

  const [info, setInfo] = React.useState<StageReleaseInfo | undefined>();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | undefined>();
  const [lastUpdated, setLastUpdated] = React.useState<Date | undefined>();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  React.useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(undefined);

        // shape varies by version, so use "any" and the object form
        const objects = await (k8sApi as any).getObjectsByEntity({
          entity,
        });

        if (cancelled) return;

        const annotations =
          (entity.metadata.annotations ?? {}) as Record<string, string>;
        const result = extractStageReleaseInfo(objects, annotations);

        setInfo(result);
        setLastUpdated(new Date());
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

    fetchData();

    return () => {
      cancelled = true;
    };
    // 👇 only run on mount & when user clicks Refresh
  }, [k8sApi, refreshKey]);

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

  if (!info) {
    return (
      <InfoCard title="Stage Releases">
        <Typography variant="body2">
          No stage release information found.
        </Typography>
      </InfoCard>
    );
  }

  const rowsToShow = info.rows.slice(0, 5); // last 5

  return (
    <InfoCard
      title="Stage Releases"
      actions={
        <Box display="flex" alignItems="center">
          {lastUpdated && (
            <Typography
              variant="caption"
              style={{ marginRight: 12, opacity: 0.7 }}
            >
              Last updated:{' '}
              {lastUpdated.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Typography>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>
      }
    >
      <Box mb={2}>
        <Typography variant="subtitle2">
          Namespace: <strong>{info.namespace}</strong>
        </Typography>

        <Typography variant="body1">
          <strong>Current version:</strong> {info.currentVersion}
        </Typography>

        <Typography variant="body1" style={{ marginTop: 8 }}>
          <strong>Previous version:</strong>{' '}
          {info.previousVersion ?? 'N/A'}
        </Typography>

        <Typography variant="body1" style={{ marginTop: 8 }}>
          <strong>Last stage deployment:</strong>{' '}
          {info.deployedAt
            ? new Date(info.deployedAt).toLocaleString()
            : 'Unknown'}
        </Typography>
      </Box>

      <Divider />

      <Box mt={2}>
        <Typography variant="h6" gutterBottom>
          Stage Version History
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Version</strong>
              </TableCell>
              <TableCell>
                <strong>Date Deployed</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rowsToShow.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.version}</TableCell>
                <TableCell>
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleString()
                    : 'Unknown'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </InfoCard>
  );
};

