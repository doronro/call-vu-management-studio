import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SummaryTable({ data }) {
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {});

  const sections = Object.keys(groupedData);

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableCaption>Summary of your form responses</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Section</TableHead>
            <TableHead>Integration ID</TableHead>
            <TableHead>Question</TableHead>
            <TableHead>Answer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map(section => (
            <React.Fragment key={section}>
              {groupedData[section].map((item, index) => (
                <TableRow key={`${section}-${index}`}>
                  {index === 0 ? (
                    <TableCell rowSpan={groupedData[section].length} className="font-medium align-top">
                      {section}
                    </TableCell>
                  ) : null}
                  <TableCell className="font-mono text-xs">{item.integrationID}</TableCell>
                  <TableCell>{item.question}</TableCell>
                  <TableCell>
                    {item.answer.startsWith('<img') ? (
                      <div dangerouslySetInnerHTML={{ __html: item.answer }} />
                    ) : (
                      item.answer
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}