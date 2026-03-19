FROM python:3.11.15-slim-trixie

RUN apt-get update && apt-get install -y nginx nodejs npm

WORKDIR /app/backend

COPY ./BackEnd/requirements.txt .

RUN pip install --no-cache-dir --upgrade pip "wheel>=0.46.3" "setuptools>=82.0.1"
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

RUN useradd -m -u 1000 user

COPY --chown=user:user ./BackEnd .

WORKDIR /app/frontend

COPY --chown=user:user ./FrontEnd/package*.json .
RUN npm install --legacy-peer-deps
COPY --chown=user:user ./FrontEnd .

WORKDIR /app
COPY nginx.conf /etc/nginx/sites-available/default
COPY start.sh .

RUN chown -R user:user /var/log/nginx /var/lib/nginx /etc/nginx /run /app/frontend \
	&& chmod +x start.sh

USER user

ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

CMD ["bash","start.sh"]