import { auth } from "@/auth";
import Loader from "@/components/layout/loader";
import userService from "@/services/user/user-services";
import { getSession } from "next-auth/react";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Loader>{children}</Loader>;
}
