// import React from "react";

// function contact() {
//   return (
//     <div>
//       <FormField
//         control={form.control}
//         name="service"
//         render={({ field }) => (
//           <FormItem>
//             {/* className={'text-black dark:text-white'} */}
//             <FormLabel>Select a service</FormLabel>

//             <FormControl>
//               <Select
//                 onValueChange={field.onChange}
//                 value={field.value || undefined}
//               >
//                 {/* text-slate-white/70 */}
//                 <SelectTrigger className="w-full border hover:border-blue dark:hover:border-accent-green dark:hover:text-accent-green">
//                   <SelectValue placeholder="Select a service" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectGroup className={"font-bold"}>
//                     {/*<SelectLabel className={'text-black dark:text-white'}>*/}
//                     {/*  Select a service*/}
//                     {/*</SelectLabel>*/}
//                     {PROVIDED_SERVICES.map((service, index) => (
//                       <SelectItem key={index} value={service}>
//                         {service}
//                       </SelectItem>
//                     ))}
//                   </SelectGroup>
//                 </SelectContent>
//               </Select>
//             </FormControl>
//             <FormMessage
//               className={"font-semibold tracking-wide text-red-700"}
//             />
//           </FormItem>
//         )}
//       />
//     </div>
//   );
// }

// export default contact;
