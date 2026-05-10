import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Joker from "./Joker";
import VolunteersDatabase from "./VolunteersDatabase";

export default function Youth() {
  return (
    <AppLayout title="غرفة الشباب والتطوع">
      <Tabs defaultValue="missions" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="missions" className="px-8">المهام (الجوكر)</TabsTrigger>
          <TabsTrigger value="database" className="px-8">قاعدة بيانات المتطوعين</TabsTrigger>
        </TabsList>
        <TabsContent value="missions" className="mt-0">
          <Joker embedded />
        </TabsContent>
        <TabsContent value="database" className="mt-0">
          <VolunteersDatabase embedded />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
