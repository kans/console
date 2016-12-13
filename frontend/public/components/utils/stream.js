// Angular's $http is slightly too high level to allow us to observe
// log messages streamed in via simple "HTTP Streaming" connections,
// so we have to roll our own simple service.

export const stream = (url, loadStart, notify) => {
  const xhr = new XMLHttpRequest();
  let offset = 0;

  const promise = new Promise((resolve, reject) => {
    const nextChunk = () => {
      const remainder = xhr.responseText.substr(offset);
      offset = xhr.responseText.length;
      notify(remainder);
    };

    const processResponse = (e) => {
      const response = e.target;

      if (response.status === 200) {
        resolve();
      } else {
        let msg = 'error';
        if (response.responseText) {
          try {
            msg = JSON.parse(response.responseText).message;
          } catch(e) {
            throw new Error(e);
          }
        }
        reject(msg);
      }
    };

    xhr.addEventListener('progress', nextChunk);
    xhr.addEventListener('loadstart', loadStart);
    xhr.addEventListener('load', nextChunk);
    xhr.addEventListener('loadend', processResponse);
    xhr.addEventListener('error', () => {
      reject('error');
    });
    xhr.addEventListener('abort', () => {
      reject('abort');
    });

    xhr.open('GET', url, true);
    xhr.send();
  });

  return {
    promise,
    abort: () => {
      xhr.abort();
    }
  };
};
