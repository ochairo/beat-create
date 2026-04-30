import { component, type BeatJsxChild } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";
import {
  Badge,
  Button,
  Card,
  CodeBlock,
  DateInput,
  Loading,
  RadioGroup,
  TextArea,
  Select,
  MultiSelect,
  NumberInput,
  TextInput,
  TimeInput,
} from "@ochairo/beat-ui";

import styles from "./ComponentsPage.module.css";

const CODE_EXAMPLE = pulse(
  `import { component } from "@ochairo/beat";\n\nconst App = component(() => <h1>Hello!</h1>);`,
);

export const ComponentsPage = component((): BeatJsxChild => {
  const text = pulse("");
  const numberValue = pulse("");
  const selected = pulse("");
  const searchSelected = pulse("");
  const multiSelected = pulse<readonly string[]>([]);
  const searchMultiSelected = pulse<readonly string[]>([]);

  return (
    <div class={styles["page"]}>
      <h1 class={styles["title"]}>Components</h1>
      <p class={styles["description"]}>
        All available Beat UI components in one place.
      </p>

      <div class={styles["grid"]}>
        <section class={styles["section"]}>
          <h2>Badge</h2>
          <div class={styles["row"]}>
            <Badge>Default</Badge>
            <Badge tone="primary">Primary</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
          </div>
        </section>

        <section class={styles["section"]}>
          <h2>Button</h2>
          <div class={styles["row"]}>
            <Button>Default</Button>
            <Button tone="primary">Primary</Button>
            <Button appearance="soft">Soft</Button>
            <Button appearance="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>
      </div>

      <div class={styles["grid"]}>
        <section class={styles["section"]}>
          <h2>Card</h2>
          <Card>
            <h3>A simple card</h3>
            <br />
            <p>
              This is a card component from Beat UI.
              <br /> It can be used to display content in a structured way.
            </p>
          </Card>
        </section>

        <section class={styles["section"]}>
          <h2>CodeBlock</h2>
          <CodeBlock code={CODE_EXAMPLE} label="TSX" />
        </section>
      </div>

      <div class={styles["grid"]}>
        <section class={styles["section"]}>
          <h2>Loading</h2>
          <div class={styles["row"]}>
            <Loading />
          </div>
        </section>

        <section class={styles["section"]}>
          <h2>RadioGroup</h2>
          <div class={styles["row"]}>
            <RadioGroup
              defaultValue="a"
              orientation="horizontal"
              options={[
                { value: "a", label: "Option A" },
                { value: "b", label: "Option B" },
                { value: "c", label: "Option C" },
              ]}
            />
          </div>
        </section>
      </div>

      <div class={styles["grid"]}>
        <section class={styles["section"]}>
          <h2>TextInput</h2>
          <div class={styles["row"]}>
            <TextInput
              value={text}
              onValueChange={(v) => text.set(v)}
              placeholder="John Doe"
            />
          </div>
        </section>

        <section class={styles["section"]}>
          <h2>NumberInput</h2>
          <div class={styles["row"]}>
            <NumberInput
              value={numberValue}
              onValueChange={(v) => numberValue.set(v)}
              placeholder="Enter a number"
            />
          </div>
        </section>
      </div>

      <div class={styles["grid"]}>
        <section class={styles["section"]}>
          <h2>DateInput</h2>
          <div class={styles["row"]}>
            <DateInput />
          </div>
        </section>

        <section class={styles["section"]}>
          <h2>TimeInput</h2>
          <div class={styles["row"]}>
            <TimeInput />
          </div>
        </section>
      </div>

      <div class={styles["grid"]}>
        <section class={styles["section"]}>
          <h2>Select</h2>
          <div class={styles["row"]}>
            <Select
              value={selected}
              onValueChange={(v) => selected.set(v)}
              options={[
                { value: "beat", label: "Beat" },
                { value: "pulse", label: "Pulse" },
                { value: "beat-ui", label: "Beat UI" },
              ]}
              placeholder="Choose a package"
            />
          </div>
        </section>

        <section class={styles["section"]}>
          <h2>MultiSelect</h2>
          <div class={styles["row"]}>
            <MultiSelect
              value={multiSelected}
              onValueChange={(v) => multiSelected.set(v)}
              options={[
                { value: "beat", label: "Beat" },
                { value: "pulse", label: "Pulse" },
                { value: "beat-ui", label: "Beat UI" },
              ]}
              placeholder="Choose packages"
            />
          </div>
        </section>
      </div>

      <div class={styles["grid"]}>
        <section class={styles["section"]}>
          <h2>Searchable Select</h2>
          <div class={styles["row"]}>
            <Select
              canSearch
              value={searchSelected}
              onValueChange={(v) => searchSelected.set(v)}
              options={[
                { value: "beat", label: "Beat" },
                { value: "pulse", label: "Pulse" },
                { value: "beat-ui", label: "Beat UI" },
              ]}
              placeholder="Search a package"
            />
          </div>
        </section>

        <section class={styles["section"]}>
          <h2>Searchable MultiSelect</h2>
          <div class={styles["row"]}>
            <MultiSelect
              canSearch
              value={searchMultiSelected}
              onValueChange={(v) => searchMultiSelected.set(v)}
              options={[
                { value: "beat", label: "Beat" },
                { value: "pulse", label: "Pulse" },
                { value: "beat-ui", label: "Beat UI" },
              ]}
              placeholder="Search packages"
            />
          </div>
        </section>
      </div>

      <section class={styles["section"]}>
        <h2>TextArea</h2>
        <div class={styles["row"]}>
          <TextArea placeholder="Write a message..." />
        </div>
      </section>
    </div>
  );
});
