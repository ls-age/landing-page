/* eslint-disable import/prefer-default-export */

export function jsonErrors(middleware) {
  return async (req, res) => {
    try {
      await middleware(req, res, (err) => {
        throw err;
      });
    } catch (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
      });

      res.end(
        JSON.stringify({
          message: err.message,
        })
      );
    }
  };
}
