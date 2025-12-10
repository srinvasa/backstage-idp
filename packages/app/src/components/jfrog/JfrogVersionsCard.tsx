import React, { useEffect, useState } from 'react';
import { InfoCard, Table } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Alert, CircularProgress } from '@material-ui/core';

type VersionRow = {
  version: string;
  path: string;
};

export const JfrogVersionsCard = () => {
  const { entity } = useEntity();
  const repo =
    entity.metadata.annotations?.['artifactory/repo'] ??
    'dcp-main-docker-local-v2';
  const image = entity.metadata.annotations?.['artifactory/image'];

  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!image) {
      setError('Missing "artifactory/image" annotation on this entity.');
      setLoading(false);
      return;
    }

    // Your working AQL, parameterized:
    const aql = `
items.find({
  "repo": "${repo}",
  "name": "manifest.json",
  "path": {"$match": "${image}/*"}
})
.include("repo", "path", "name")
`;

    const fetchVersions = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const resp = await fetch('/api/proxy/artifactory-aql', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Accept': 'application/json',
          },
          body: aql,
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(
            `Artifactory AQL request failed (${resp.status}): ${text}`,
          );
        }

        const data = await resp.json();

        const versions: VersionRow[] =
          (data.results || []).map((r: any) => {
            const path: string = r.path || '';
            const parts = path.split('/');
            // path = "<image>/<version>"
            const version = parts[1] || path;
            return { version, path };
          }) || [];

        // Sort descending (latest first) if versions are semver-ish
        versions.sort((a, b) => (a.version < b.version ? 1 : -1));

        setRows(versions);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to load versions from Artifactory.');
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [repo, image]);

  const columns = [
    { title: 'Version', field: 'version' },
    { title: 'Path', field: 'path' },
  ];

  return (
    <InfoCard title="Artifactory Image Versions">
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <Table
          options={{ paging: true, pageSize: 5 }}
          columns={columns}
          data={rows}
        />
      )}
    </InfoCard>
  );
};

