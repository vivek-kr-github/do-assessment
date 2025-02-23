**Overview of Application - SSL Certificate Checker:**

SSL Checker is a cloud-native web application deployed on DigitalOcean Kubernetes (DOKS) that allows users to fetch and log SSL certificate details for a given website URL. The application consists of a frontend (Nginx), a backend (Node.js API), and a managed MongoDB database. It is containerized using Docker and utilizes DigitalOcean Container Registry (DOCR) for image storage.

**URL:https://ssl-checker.vivekkr.online/**

![image](https://github.com/user-attachments/assets/c70e476d-8f4b-4dc2-806e-71d7292d1d4e)


**Use of the Website**
This web application allows users to retrieve SSL certificate details for any website by simply entering a URL which prevents certificate outages. It provides key SSL certificate information such as:
* Issuer (Who issued the certificate?)
* Validity Period (Start and expiry dates)
* Serial Number (Unique identifier of the certificate)
* Subject (Website it is issued for)
  
For instance, enterprise organizations like Microsoft and Cisco have recently experienced certificate outages. A monitoring tool like this would help customers prevent such issues.

**Project Structure:**
* [do-assessment (Root)] - (Centralized project directory for managing backend, frontend, and Kubernetes configurations.)
* [backend] - Node.js API for SSL certificate fetching
* [server.js] - Express API that fetches SSL certificate details from a given domain
* [package.json] - Manages dependencies (e.g., express, axios, mongoose)
* [Dockerfile] - Defines the containerized environment for the backend service
* [frontend] - (Nginx Static Frontend)
* [index.html] - Simple UI for user input (enter website URL)
* [nginx.conf] - Configures Nginx to serve static assets. Reverse-proxy requests to the backend API
* [Dockerfile] - Builds and serves the frontend using Nginx
* [kubernetes] - (Kubernetes Deployment Files)
* [namespaces.yaml] - Defines namespaces for isolating services.
* [backend-deployment.yaml] - Deploys the Node.js API with necessary resources and environment settings
* [frontend-deployment.yaml] - Deploys the Nginx frontend service
* [mongodb-secret.yaml] - Stores sensitive MongoDB credentials as Kubernetes secrets
* [hpa.yaml] - Horizontal Pod Autoscaler (HPA) config for auto-scaling based on CPU/memory usage
* [namespace.yaml] - Namespace definition (ensure this is referenced in other YAML files)
* [docker-compose.yaml] - Useful for local development/testing of services

### Building From Source Code
Clone this repository:

```bash
> git clone git@github.com:vivek-kr-github/do-assessment.git
> cd do-assessment
```
**Features**

* Fetch SSL certificate details for any domain
* Store certificate details in DigitalOcean Managed MongoDB
* Uses Nginx as frontend and Node.js as backend
* Kubernetes deployment with Horizontal Pod Autoscaling (HPA)
* Secure SSL offloading with DigitalOcean Load Balancer (Let's Encrypt)
* Fully containerized and deployed using DOCR & Kubernetes

**Deployment Guide**

1️⃣ **Prerequisites**

DigitalOcean Kubernetes Cluster (DOKS)

DigitalOcean Container Registry (DOCR)

DigitalOcean Managed MongoDB

kubectl & doctl CLI installed

2️⃣ **Setup DigitalOcean Resources**

**Authenticate with DigitalOcean**
export DO_API_TOKEN="your-digitalocean-api-token"

doctl auth init --access-token $DO_API_TOKEN

doctl kubernetes cluster create ssl-checker-cluster --region bglr --size s-2vcpu-4gb --count 2

docker login registry.digitalocean.com

doctl registry create ssl-checker-registry

3️⃣ Build & Push Docker Images

**Authenticate with DOCR**
doctl registry login

**Build and push the backend image**
cd /do-assessment/backend/

docker build -t registry.digitalocean.com/ssl-checker-registry/backend:latest .

docker push registry.digitalocean.com/ssl-checker-registry/backend:latest


**Build and push frontend image**
cd /do-assessment/frontend

docker build -t registry.digitalocean.com/ssl-checker-registry/frontend:latest .

docker push registry.digitalocean.com/ssl-checker-registry/frontend:latest


4️⃣ **Deploy to Kubernetes**
cd /do-assessment/yaml

kubectl apply -f kubernetes/namespaces.yaml

kubectl apply -f kubernetes/mongodb-secret.yaml

kubectl apply -f kubernetes/backend-deployment.yaml

kubectl apply -f kubernetes/frontend-deployment.yaml

kubectl apply -f kubernetes/hpa.yaml


5️⃣ **Verify Deployment**

kubectl get pods -A

kubectl get deployments -A

kubectl get secrets -A

kubectl get services -A

kubectl get hpa -A

**How It Works (Flow Diagram)**

User enters a website URL in the frontend.

Request is sent through DigitalOcean Load Balancer (offloaded with Let's Encrypt SSL).

The load balancer forwards the request to Nginx (Frontend).

Nginx proxies the request to Node.js (Backend API).

The backend fetches SSL certificate details using OpenSSL libraries.

Certificate details are stored in DigitalOcean Managed MongoDB.

The response is sent back to the user.

HPA scales frontend & backend pods based on traffic load.
