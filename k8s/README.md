# Bookly on Kubernetes

These Kustomize manifests deploy the full Bookly stack (`api-gateway`, `frontend`, 5 backend microservices, `mongo`, and `redis`) into the `bookly` namespace with health probes, Horizontal Pod Autoscaling on `booking-service`, TLS termination, and zero-trust `NetworkPolicy` isolation.

## 1. Build images (local cluster like kind / minikube / Docker Desktop K8s)

```bash
docker compose build
```

If deploying to a remote cluster, tag and push each `bookly-*` image to your registry and update image names via a Kustomize overlay.

## 2. Create production secrets & TLS cert

Edit `k8s/secret.yaml` (or create `bookly-secrets` and `bookly-tls` directly via `kubectl`):

```bash
kubectl create namespace bookly --dry-run=client -o yaml | kubectl apply -f -
kubectl -n bookly create secret generic bookly-secrets \
  --from-literal=MONGO_URI="mongodb://mongo:27017" \
  --from-literal=JWT_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" \
  --from-literal=ADMIN_EMAIL="admin@bookly.dev" \
  --from-literal=ADMIN_PASSWORD="<strong-password>"
```

## 3. Deploy & verify

```bash
kubectl apply -k k8s/
kubectl -n bookly get pods,svc,hpa,ingress,networkpolicy
```
