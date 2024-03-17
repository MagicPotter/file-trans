"use client"

import { Button } from "@/components/ui/button";
import {useOrganization, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dialog, DialogContent, DialogDescription,DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, {
    message: "Der Titel muss mind. 1 Zeichen besitzen.",
  }),
  file: z.custom<FileList>((val) => val instanceof FileList, "Required").refine((files) => files.length > 0, `Required`)
})

export default function Home() {
  const { toast } = useToast();
  const  organization = useOrganization();
  const user = useUser();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      file: undefined
    },
  });

  const fileRef = form.register("file");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if(!orgId) return;
    const postUrl = await generateUploadUrl();
    
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": values.file[0].type },
      body: values.file[0]
    });

    const { storageId } = await result.json();
    
    try {
      await createFile({
        name: values.title,
        fileId: storageId,
        orgId
      });
  
      setIsFileDialogOpen(false);
      toast({
        variant: "success",
        title: "Datei hochgeladen",
        description: "Jeder kann deine Datei jetzt sehen"
      }) 
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler beim hochladen",
        description: "Deine Datei konnte nicht hochgeladen werden, versuche es nochmal"
      })
    }
  }

  let orgId: string | undefined = undefined;
  if(organization.isLoaded && user.isLoaded) {
      orgId = organization.organization?.id ?? user.user?.id;
  }

  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

  const files = useQuery(api.files.getFiles, orgId ? { orgId } : "skip");
  const createFile = useMutation(api.files.createFile);

  return (
    <main className="container mx-auto pt-12">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Deine Dateien</h1>
        <Dialog open={isFileDialogOpen} onOpenChange={(isOpen) => {
          setIsFileDialogOpen(isOpen)
          form.reset();
          }}>
          <DialogTrigger asChild>
          <Button variant={"outline"} onClick={() => {
        }}>Datei hochladen</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="mb-4">Deine Datei hochladen</DialogTitle>
              <DialogDescription>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
                  <FormField control={form.control} name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titel</FormLabel>
                        <FormControl>
                          <Input placeholder="Titel" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="file"
                    render={() => (
                      <FormItem>
                        <FormLabel>Datei</FormLabel>
                        <FormControl>
                          <Input type="file" {...fileRef} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={form.formState.isSubmitting} className="flex gap-1 ">
                    {form.formState.isSubmitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Hochladen
                  </Button>
                </form>
              </Form>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    {files?.map((file) => {
      return <div key={file._id}>{file.name}</div>
    })}
    </main>
  );
}
