# Sandbox Seed

Populates the Amplify sandbox with LIS test data (ExamTypes, Patients, WorkOrders, Samples, Exams).

## Setup (one-time)

1. **Install** (already in devDependencies):
   ```bash
   pnpm add -D @aws-amplify/seed
   ```

2. **Generate IAM policy** (attach to your AWS profile/role):
   ```bash
   npx ampx sandbox seed generate-policy > seed-policy.json
   aws iam put-role-policy --role-name <your-role> --policy-name AmplifySeedPolicy --policy-document file://seed-policy.json
   ```

## Run

```bash
# Ensure sandbox is running first
pnpm sandbox

# Then seed
pnpm seed
# or: npx ampx sandbox seed
```

## Reference

- [Sandbox Seed docs](https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/seed)
