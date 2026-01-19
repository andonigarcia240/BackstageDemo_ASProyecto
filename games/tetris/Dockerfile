FROM alpine/git:latest AS fetch

WORKDIR /src

RUN git clone --depth=1 https://github.com/jakesgordon/javascript-tetris .

FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=fetch /src/ /usr/share/nginx/html/

EXPOSE 80
