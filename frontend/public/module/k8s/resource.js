import * as _ from 'lodash-es';
import {coFetchJSON} from '../../co-fetch';
import {k8sBasePath} from './k8s';
import {selectorToString} from './selector';
import {WSFactory} from '../ws-factory';

const getK8sAPIPath = kind => {
  let p = k8sBasePath;

  if (kind.legacy) {
    p += '/api/';
  } else {
    p += '/apis/';
  }

  if (kind.apiGroup) {
    p += `${kind.apiGroup}/`;
  }

  p += kind.apiVersion;
  return p;
};

export const resourceURL = (kind, options) => {
  let q = '';
  let u = getK8sAPIPath(kind);

  if (options.ns) {
    u += `/namespaces/${options.ns}`;
  }
  u += `/${kind.path}`;
  if (options.name) {
    u += `/${options.name}`;
  }
  if (options.path) {
    u += `/${options.path}`;
  }
  if (!_.isEmpty(options.queryParams)) {
    q = _.map(options.queryParams, function(v, k) {
      return `${k}=${v}`;
    });
    u += `?${q.join('&')}`;
  }

  return u;
};

export const watchURL = (kind, options) => {
  const opts = options || {};

  opts.queryParams = opts.queryParams || {};
  opts.queryParams.watch = true;
  return resourceURL(kind, opts);
};

export const k8sGet = (kind, name, ns, opts) => coFetchJSON(resourceURL(kind, Object.assign({ns, name}, opts)));

export const k8sCreate = (kind, data, opts = {}) => {
  // Occassionally, a resource won't have a metadata property.
  // For example: apps.openshift.io/v1 DeploymentRequest
  // https://github.com/openshift/api/blob/master/apps/v1/types.go
  data.metadata = data.metadata || {};

  // Lowercase the resource name
  // https://github.com/kubernetes/kubernetes/blob/HEAD/docs/user-guide/identifiers.md#names
  if (data.metadata.name && !data.metadata.generateName) {
    data.metadata.name = data.metadata.name.toLowerCase();
  }

  return coFetchJSON.post(resourceURL(kind, Object.assign({ns: data.metadata.namespace}, opts)), data);
};

export const k8sUpdate = (kind, data, ns, name) => coFetchJSON.put(
  resourceURL(kind, {ns: ns || data.metadata.namespace, name: name || data.metadata.name}),
  data
);

export const k8sPatch = (kind, resource, data) => coFetchJSON.patch(
  resourceURL(kind, {ns: resource.metadata.namespace, name: resource.metadata.name}),
  data
);

export const k8sKill = (kind, resource, opts = {}, json = null) => coFetchJSON.delete(
  resourceURL(kind, Object.assign({ns: resource.metadata.namespace, name: resource.metadata.name}, opts)), opts, json
);

export const k8sList = (kind, params={}, raw=false, options = {}) => {
  const query = _.map(_.omit(params, 'ns'), (v, k) => {
    if (k === 'labelSelector') {
      v = selectorToString(v);
    }
    return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  }).join('&');

  const k = kind.kind === 'Namespace' ? {
    // hit our custom /namespaces path which better handles users with limited permissions
    legacy: true,
    apiGroup: '../..',
    apiVersion: 'tectonic',
    path: 'namespaces',
  } : kind;

  const listURL = resourceURL(k, {ns: params.ns});
  return coFetchJSON(`${listURL}?${query}`, 'GET', options).then(result => raw ? result : result.items);
};

export const k8sListPartialMetadata = (kind, params = {}, raw = false) => {
  // FIXME: Use v1beta1 in kube 1.10
  return k8sList(kind, params, raw, {headers: {Accept: 'application/json;as=PartialObjectMetadataList;v=v1alpha1;g=meta.k8s.io,application/json'}});
};

export const k8sWatch = (kind, query={}, wsOptions={}) => {
  const queryParams = {watch: true};
  const opts = {queryParams};
  wsOptions = Object.assign({
    host: 'auto',
    reconnect: true,
    jsonParse: true,
    bufferFlushInterval: 500,
    bufferMax: 1000,
  }, wsOptions);

  const labelSelector = query.labelSelector || kind.labelSelector;
  if (labelSelector) {
    const encodedSelector = encodeURIComponent(selectorToString(labelSelector));
    if (encodedSelector) {
      queryParams.labelSelector = encodedSelector;
    }
  }

  if (query.fieldSelector) {
    queryParams.fieldSelector = encodeURIComponent(query.fieldSelector);
  }

  if (query.ns) {
    opts.ns = query.ns;
  }

  if (query.resourceVersion) {
    queryParams.resourceVersion = encodeURIComponent(query.resourceVersion);
  }

  const path = resourceURL(kind, opts);
  wsOptions.path = path;
  return new WSFactory(path, wsOptions);
};
