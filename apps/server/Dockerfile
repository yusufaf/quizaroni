# Built from the prebuilt standalone binaries, so no step runs on the target
# platform and a multi-arch build needs no emulation:
#   docker buildx build --platform linux/amd64,linux/arm64 -f apps/server/Dockerfile apps/server/dist
# The build context must hold quizaroni-linux-x64 and quizaroni-linux-arm64.
FROM --platform=$BUILDPLATFORM busybox:1.38@sha256:a46257e06c82ad85242d0d38077d0a52d9896389ca60a1a59d3463db586e5fa4 AS stage
ARG TARGETARCH
COPY quizaroni-linux-x64 quizaroni-linux-arm64 /in/
RUN case "$TARGETARCH" in amd64) a=x64 ;; arm64) a=arm64 ;; *) echo "unsupported architecture $TARGETARCH" >&2; exit 1 ;; esac \
 && mkdir -p /out/bin /out/datadir/data \
 && cp "/in/quizaroni-linux-$a" /out/bin/quizaroni \
 && chmod 0755 /out/bin/quizaroni

FROM gcr.io/distroless/cc-debian13:nonroot@sha256:29ee70762214fe8190cea04ef1c0a84a8365879e047ce8f911ae5a5ab2355fa2
LABEL org.opencontainers.image.source=https://github.com/yusufaf/quizaroni \
      org.opencontainers.image.licenses=MIT \
      org.opencontainers.image.title=Quizaroni \
      org.opencontainers.image.description="Self-hosted Quizaroni server"
COPY --from=stage /out/bin/quizaroni /usr/local/bin/quizaroni
# Copying the parent makes /data a copied entry, so --chown applies to it.
COPY --from=stage --chown=65532:65532 /out/datadir/ /
ENV QZ_HOST=0.0.0.0 \
    QZ_PORT=8080 \
    QZ_DATA_DIR=/data \
    QZ_OPEN_BROWSER=false
USER 65532:65532
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD ["/usr/local/bin/quizaroni", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/quizaroni"]
