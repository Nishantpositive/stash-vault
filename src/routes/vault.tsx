import { createFileRoute } from "@tanstack/react-router";
import { VaultApp } from "@/components/vault-app";

export const Route = createFileRoute("/vault")({ component: VaultApp });
