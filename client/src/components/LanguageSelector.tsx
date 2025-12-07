import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", name: "English", flag: "GB" },
  { code: "pt", name: "Português", flag: "PT" },
  { code: "nl", name: "Nederlands", flag: "NL" },
  { code: "fr", name: "Français", flag: "FR" },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
    localStorage.setItem("language", value);
  };

  return (
    <Select value={i18n.language} onValueChange={handleChange}>
      <SelectTrigger className="w-auto gap-2" data-testid="select-language">
        <Globe className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} data-testid={`select-language-${lang.code}`}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
