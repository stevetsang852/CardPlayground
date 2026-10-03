FROM redis:7-alpine

# compose build context is the repo root
COPY database/redis.conf /usr/local/etc/redis/redis.conf

EXPOSE 6379
VOLUME ["/data"]

HEALTHCHECK --interval=5s --timeout=3s --retries=10 CMD redis-cli ping | grep PONG

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
