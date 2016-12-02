import React from 'react';

import {LabelList, Selector, Timestamp} from '../utils';

export const pluralize = (i, singular, plural = `${singular}s`) => `${i || 0} ${i === 1 ? singular : plural}`;

export const detailsPage = (Component) => (props) =>
  <div className="row row-gutter">
    <Component {...props} />
  </div>;

export const ResourceHeading = ({resourceName}) => <div className="co-m-pane__heading">
  <h1 className="co-m-pane__title">{resourceName} Overview</h1>
</div>;

export const ResourceSummary = ({resource}) => <dl>
  <dt>Name</dt>
  <dd>{resource.metadata.name || '-'}</dd>
  <dt>Labels</dt>
  <dd><LabelList kind={resource.kind.toLowerCase()} labels={resource.metadata.labels} /></dd>
  <dt>Pod Selector</dt>
  <dd><Selector selector={resource.spec.selector} /></dd>
  <dt>Created At</dt>
  <dd><Timestamp timestamp={resource.metadata.creationTimestamp} /></dd>
</dl>;

export const ResourcePodCount = ({resource}) => <dl>
  <dt>Current Count</dt>
  <dd>{resource.status.replicas || 0}</dd>
  <dt>Desired Count</dt>
  <dd>{resource.spec.replicas || 0}</dd>
</dl>;
