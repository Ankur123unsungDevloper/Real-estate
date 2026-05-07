"use client";

import React from "react";

import SettingsForm from "@/components/SettingsForm";

import {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
} from "@/state/api";

const TenantSettings = () => {
  const { data: authUser, isLoading, isError } =
    useGetAuthUserQuery();

  const [updateTenant] = useUpdateTenantSettingsMutation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !authUser || !authUser.userInfo) {
    return <div>Failed to load tenant information.</div>;
  }

  const initialData = {
    name: authUser.userInfo?.name || "",
    email: authUser.userInfo?.email || "",
    phoneNumber: authUser.userInfo?.phoneNumber || "",
  };

  const handleSubmit = async (data: typeof initialData) => {
    try {
      await updateTenant({
        cognitoId: authUser.cognitoInfo?.userId || "",
        ...data,
      });

      console.log("Tenant updated successfully");
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      userType="tenant"
    />
  );
};

export default TenantSettings;